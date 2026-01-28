// src/server-actions/simple-schedules/cash-at-bank.ts
'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { cashAtBankLeadDefault } from '@/lib/schedules/templates/cash-at-bank'
import type {
  SimpleScheduleDocV1,
  ScheduleLine,
  ScheduleLineUi,
  ScheduleSectionUi
} from '@/lib/schedules/simpleScheduleTypes'
import type {
  LineItemScheduleDocV1,
  LineItemScheduleRowV1
} from '@/lib/schedules/lineItemScheduleTypes'

const CODE = 'B61-cash_at_bank'

// supporting schedule
const BANK_ACCOUNTS_CODE = 'B61-cash_at_bank_accounts'

// derived line ids in lead
const CASH_AT_BANK_LINE_ID = 'cash-at-bank'
const BANK_OVERDRAFT_MEMO_LINE_ID = 'bank-overdraft-memo'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function readSectionUi(v: unknown): ScheduleSectionUi | undefined {
  if (v === undefined) return undefined
  if (!isRecord(v)) return undefined

  const emphasis = v.emphasis
  const tone = v.tone

  const okEmphasis =
    emphasis === undefined ||
    emphasis === 'none' ||
    emphasis === 'soft' ||
    emphasis === 'strong'

  const okTone =
    tone === undefined ||
    tone === 'default' ||
    tone === 'muted' ||
    tone === 'primary' ||
    tone === 'info' ||
    tone === 'warn'

  if (!okEmphasis || !okTone) return undefined

  return {
    emphasis: emphasis as ScheduleSectionUi['emphasis'],
    tone: tone as ScheduleSectionUi['tone']
  }
}

function readLineUi(v: unknown): ScheduleLineUi | undefined {
  if (v === undefined) return undefined
  if (!isRecord(v)) return undefined

  const emphasis = v.emphasis
  const tone = v.tone

  const okEmphasis =
    emphasis === undefined ||
    emphasis === 'none' ||
    emphasis === 'soft' ||
    emphasis === 'strong'

  const okTone =
    tone === undefined ||
    tone === 'default' ||
    tone === 'muted' ||
    tone === 'info' ||
    tone === 'warn'

  if (!okEmphasis || !okTone) return undefined

  return {
    emphasis: emphasis as ScheduleLineUi['emphasis'],
    tone: tone as ScheduleLineUi['tone']
  }
}

function normalizeToV1WithKinds(raw: unknown): SimpleScheduleDocV1 | null {
  if (!isRecord(raw)) return null
  if (raw.kind !== 'SIMPLE_SCHEDULE' || raw.version !== 1) return null
  if (!Array.isArray(raw.sections)) return null

  const sections: SimpleScheduleDocV1['sections'] = raw.sections
    .filter(isRecord)
    .map(s => {
      const id = typeof s.id === 'string' ? s.id : crypto.randomUUID()
      const title = typeof s.title === 'string' ? s.title : 'Section'
      const notes = typeof s.notes === 'string' ? s.notes : undefined
      const ui = readSectionUi(s.ui)

      const linesRaw = Array.isArray(s.lines) ? s.lines : []
      const lines: ScheduleLine[] = linesRaw.filter(isRecord).map(l => {
        const lineId = typeof l.id === 'string' ? l.id : crypto.randomUUID()
        const label = typeof l.label === 'string' ? l.label : 'Line'
        const ui = readLineUi(l.ui)

        if (l.kind === 'INPUT') {
          const amt =
            l.amount === null || typeof l.amount === 'number' ? l.amount : null
          return {
            kind: 'INPUT',
            id: lineId,
            label,
            amount: amt,
            notes: typeof l.notes === 'string' ? l.notes : undefined,
            ...(ui ? { ui } : {})
          }
        }

        if (l.kind === 'TOTAL') {
          const sumOf = Array.isArray(l.sumOf)
            ? l.sumOf.filter(x => typeof x === 'string')
            : []
          return {
            kind: 'TOTAL',
            id: lineId,
            label,
            sumOf,
            ...(ui ? { ui } : {})
          }
        }

        if (l.kind === 'CALC') {
          const add = Array.isArray(l.add)
            ? l.add.filter(x => typeof x === 'string')
            : []
          const subtract = Array.isArray(l.subtract)
            ? l.subtract.filter(x => typeof x === 'string')
            : []
          return {
            kind: 'CALC',
            id: lineId,
            label,
            add,
            ...(subtract.length ? { subtract } : {}),
            notes: typeof l.notes === 'string' ? l.notes : undefined,
            ...(ui ? { ui } : {})
          }
        }

        // fallback -> treat as input
        const oldAmt =
          l.amount === null || typeof l.amount === 'number' ? l.amount : null
        return {
          kind: 'INPUT',
          id: lineId,
          label,
          amount: oldAmt,
          notes: typeof l.notes === 'string' ? l.notes : undefined,
          ...(ui ? { ui } : {})
        }
      })

      return { id, title, lines, notes, ...(ui ? { ui } : {}) }
    })

  const attachmentsRaw = Array.isArray(
    (raw as { attachments?: unknown }).attachments
  )
    ? ((raw as { attachments?: unknown }).attachments as unknown[])
    : undefined

  const attachments =
    attachmentsRaw?.filter(isRecord).map(a => ({
      id: typeof a.id === 'string' ? a.id : crypto.randomUUID(),
      name: typeof a.name === 'string' ? a.name : 'Attachment',
      url: typeof a.url === 'string' ? a.url : ''
    })) ?? undefined

  return { kind: 'SIMPLE_SCHEDULE', version: 1, sections, attachments }
}

function ensureLeadTotals(doc: SimpleScheduleDocV1): {
  doc: SimpleScheduleDocV1
  changed: boolean
} {
  let changed = false

  const SECTION_ID = 'summary'
  const TOTAL_ID = 'cash-total'
  const LABEL = 'Total cash and cash equivalents'

  // NOTE: include special-cases in total (this is the UX-friendly approach)
  const SUM_OF = [
    'cash-at-bank',
    'cash-at-bank-special-cases',
    'cash-in-hand'
  ] as const

  const next: SimpleScheduleDocV1 = {
    ...doc,
    sections: doc.sections.map(s => ({ ...s, lines: [...s.lines] }))
  }

  const sIdx = next.sections.findIndex(s => s.id === SECTION_ID)
  if (sIdx === -1) return { doc: next, changed: false }

  const section = next.sections[sIdx]
  const tIdx = section.lines.findIndex(l => l.id === TOTAL_ID)

  const desired: ScheduleLine = {
    kind: 'TOTAL',
    id: TOTAL_ID,
    label: LABEL,
    sumOf: [...SUM_OF],
    ui: { emphasis: 'strong', tone: 'info' }
  }

  if (tIdx === -1) {
    section.lines.push(desired)
    return { doc: next, changed: true }
  }

  const existing = section.lines[tIdx]
  if (existing.kind !== 'TOTAL') {
    section.lines[tIdx] = desired
    return { doc: next, changed: true }
  }

  const existingSumOf = Array.isArray(existing.sumOf) ? existing.sumOf : []
  const needsSumOf =
    existingSumOf.length !== SUM_OF.length ||
    existingSumOf.some((v, i) => v !== SUM_OF[i])

  const needsLabel = existing.label !== LABEL
  const needsUi =
    !existing.ui ||
    existing.ui.emphasis !== 'strong' ||
    existing.ui.tone !== 'info'

  if (needsSumOf || needsLabel || needsUi) {
    section.lines[tIdx] = { ...existing, ...desired }
    changed = true
  }

  return { doc: next, changed }
}

function ensureLeadAttachments(doc: SimpleScheduleDocV1): {
  doc: SimpleScheduleDocV1
  changed: boolean
} {
  let changed = false
  const next: SimpleScheduleDocV1 = { ...doc }
  const existing = [...(next.attachments ?? [])]

  const ensure = (id: string, name: string) => {
    if (existing.some(a => a.id === id)) return
    existing.push({ id, name, url: '' })
    changed = true
  }

  ensure('bank-statements', 'Bank statements')
  ensure('bank-recon', 'Bank reconciliation / working papers')
  ensure('cash-count', 'Cash count / petty cash support')

  if (changed) next.attachments = existing
  return { doc: next, changed }
}

function injectDerivedAmount(
  doc: SimpleScheduleDocV1,
  lineId: string,
  amount: number
): { doc: SimpleScheduleDocV1; changed: boolean } {
  let changed = false
  const safeAmt = Number.isFinite(amount) ? amount : 0

  const next: SimpleScheduleDocV1 = {
    ...doc,
    sections: doc.sections.map(s => ({ ...s, lines: [...s.lines] }))
  }

  for (const section of next.sections) {
    section.lines = section.lines.map(l => {
      if (l.kind !== 'INPUT' || l.id !== lineId) return l
      if ((l.amount ?? null) !== safeAmt) changed = true
      return { ...l, amount: safeAmt }
    })
  }

  return { doc: next, changed }
}

// ---- read & normalize line-item schedule (bank accounts) ----

function isLineItemScheduleDocV1(v: unknown): v is LineItemScheduleDocV1 {
  if (!isRecord(v)) return false
  return (
    v.kind === 'LINE_ITEM_SCHEDULE' &&
    v.version === 1 &&
    typeof v.title === 'string' &&
    Array.isArray(v.rows)
  )
}

function normalizeLineItemSchedule(raw: unknown): LineItemScheduleDocV1 | null {
  if (!isLineItemScheduleDocV1(raw)) return null

  const rows: LineItemScheduleRowV1[] = raw.rows.filter(isRecord).map(r => ({
    id: typeof r.id === 'string' ? r.id : crypto.randomUUID(),
    name: typeof r.name === 'string' ? r.name : 'Line',
    description: typeof r.description === 'string' ? r.description : '',
    current:
      r.current === null || typeof r.current === 'number' ? r.current : null,
    prior: r.prior === null || typeof r.prior === 'number' ? r.prior : null
  }))

  return { kind: 'LINE_ITEM_SCHEDULE', version: 1, title: raw.title, rows }
}

async function readBankTotals(params: {
  clientId: string
  periodId: string
}): Promise<{ positiveTotal: number; overdraftMemo: number }> {
  const { clientId, periodId } = params

  const row = await db
    .select({ contentJson: planningDocs.contentJson })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, clientId),
        eq(planningDocs.periodId, periodId),
        eq(planningDocs.code, BANK_ACCOUNTS_CODE)
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  const doc = row?.contentJson
    ? normalizeLineItemSchedule(row.contentJson)
    : null
  const rows = doc?.rows ?? []

  let positiveTotal = 0
  let overdraftMemo = 0

  for (const r of rows) {
    const n =
      typeof r.current === 'number' && Number.isFinite(r.current)
        ? r.current
        : 0
    if (n >= 0) positiveTotal += n
    else overdraftMemo += Math.abs(n)
  }

  return { positiveTotal, overdraftMemo }
}

async function getPriorPeriod(clientId: string, currentPeriodId: string) {
  const current = await db
    .select({
      id: accountingPeriods.id,
      startDate: accountingPeriods.startDate,
      endDate: accountingPeriods.endDate
    })
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.clientId, clientId),
        eq(accountingPeriods.id, currentPeriodId)
      )
    )
    .then(r => r[0] ?? null)

  if (!current) {
    return {
      prior: null as null | { id: string; startDate: string; endDate: string }
    }
  }

  const prior = await db
    .select({
      id: accountingPeriods.id,
      startDate: accountingPeriods.startDate,
      endDate: accountingPeriods.endDate
    })
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.clientId, clientId),
        lt(accountingPeriods.endDate, current.startDate)
      )
    )
    .orderBy(desc(accountingPeriods.endDate))
    .limit(1)
    .then(r => r[0] ?? null)

  return { prior }
}

export async function getCashAtBankLeadScheduleAction(input: {
  clientId: string
  periodId: string
}): Promise<
  ActionResult<{
    current: SimpleScheduleDocV1
    prior: SimpleScheduleDocV1 | null
    priorPeriod: { startDate: string; endDate: string } | null
  }>
> {
  try {
    const { clientId, periodId } = input

    const existing = await db
      .select({ id: planningDocs.id, contentJson: planningDocs.contentJson })
      .from(planningDocs)
      .where(
        and(
          eq(planningDocs.clientId, clientId),
          eq(planningDocs.periodId, periodId),
          eq(planningDocs.code, CODE)
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    const normalized = existing?.contentJson
      ? normalizeToV1WithKinds(existing.contentJson)
      : null

    let current: SimpleScheduleDocV1 = normalized ?? cashAtBankLeadDefault

    const ensuredTotals = ensureLeadTotals(current)
    current = ensuredTotals.doc

    const ensuredAttachments = ensureLeadAttachments(current)
    current = ensuredAttachments.doc

    // ✅ inject derived bank totals (positive + overdraft memo)
    // NOTE: we DO NOT fold "special cases" into cash-at-bank anymore.
    const bankTotals = await readBankTotals({ clientId, periodId })

    const injectedBank = injectDerivedAmount(
      current,
      CASH_AT_BANK_LINE_ID,
      bankTotals.positiveTotal
    )
    current = injectedBank.doc

    const injectedOverdraftMemo = injectDerivedAmount(
      current,
      BANK_OVERDRAFT_MEMO_LINE_ID,
      bankTotals.overdraftMemo
    )
    current = injectedOverdraftMemo.doc

    if (
      existing &&
      (ensuredTotals.changed ||
        ensuredAttachments.changed ||
        injectedBank.changed ||
        injectedOverdraftMemo.changed)
    ) {
      await db
        .update(planningDocs)
        .set({ contentJson: current })
        .where(eq(planningDocs.id, existing.id))
    }

    if (!existing) {
      await db
        .insert(planningDocs)
        .values({
          clientId,
          periodId,
          code: CODE,
          content: '',
          contentJson: current,
          isComplete: false
        })
        .onConflictDoNothing({
          target: [
            planningDocs.clientId,
            planningDocs.periodId,
            planningDocs.code
          ]
        })
    }

    const { prior } = await getPriorPeriod(clientId, periodId)

    let priorDoc: SimpleScheduleDocV1 | null = null
    if (prior) {
      const priorRow = await db
        .select({ contentJson: planningDocs.contentJson })
        .from(planningDocs)
        .where(
          and(
            eq(planningDocs.clientId, clientId),
            eq(planningDocs.periodId, prior.id),
            eq(planningDocs.code, CODE)
          )
        )
        .limit(1)
        .then(r => r[0] ?? null)

      priorDoc = priorRow?.contentJson
        ? normalizeToV1WithKinds(priorRow.contentJson)
        : null

      if (priorDoc) {
        priorDoc = ensureLeadTotals(priorDoc).doc
        priorDoc = ensureLeadAttachments(priorDoc).doc

        const priorBankTotals = await readBankTotals({
          clientId,
          periodId: prior.id
        })
        priorDoc = injectDerivedAmount(
          priorDoc,
          CASH_AT_BANK_LINE_ID,
          priorBankTotals.positiveTotal
        ).doc
        priorDoc = injectDerivedAmount(
          priorDoc,
          BANK_OVERDRAFT_MEMO_LINE_ID,
          priorBankTotals.overdraftMemo
        ).doc
      }
    }

    return {
      success: true,
      data: {
        current,
        prior: priorDoc,
        priorPeriod: prior
          ? { startDate: prior.startDate, endDate: prior.endDate }
          : null
      }
    }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error
          ? e.message
          : 'Failed to load cash at bank lead schedule'
    }
  }
}

export async function saveCashAtBankLeadScheduleAction(input: {
  clientId: string
  periodId: string
  doc: SimpleScheduleDocV1
}): Promise<ActionResult<null>> {
  try {
    const { clientId, periodId } = input

    const ensuredTotals = ensureLeadTotals(input.doc)
    let docToSave = ensuredTotals.doc

    const ensuredAttachments = ensureLeadAttachments(docToSave)
    docToSave = ensuredAttachments.doc

    // ✅ force derived values on save (do not fold special-cases)
    const bankTotals = await readBankTotals({ clientId, periodId })
    docToSave = injectDerivedAmount(
      docToSave,
      CASH_AT_BANK_LINE_ID,
      bankTotals.positiveTotal
    ).doc
    docToSave = injectDerivedAmount(
      docToSave,
      BANK_OVERDRAFT_MEMO_LINE_ID,
      bankTotals.overdraftMemo
    ).doc

    await db
      .insert(planningDocs)
      .values({
        clientId,
        periodId,
        code: CODE,
        content: '',
        contentJson: docToSave,
        isComplete: false
      })
      .onConflictDoUpdate({
        target: [
          planningDocs.clientId,
          planningDocs.periodId,
          planningDocs.code
        ],
        set: { content: '', contentJson: docToSave, isComplete: false }
      })

    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/cash-at-bank`
    )

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error
          ? e.message
          : 'Failed to save cash at bank lead schedule'
    }
  }
}
