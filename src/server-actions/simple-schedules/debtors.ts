'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { debtorsDefault } from '@/lib/schedules/templates/debtors'
import type {
  SimpleScheduleDocV1,
  ScheduleLine,
  ScheduleLineUi,
  ScheduleSectionUi
} from '@/lib/schedules/simpleScheduleTypes'

const CODE = 'B61-debtors'

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

function ensureDebtorsTotals(doc: SimpleScheduleDocV1): {
  doc: SimpleScheduleDocV1
  changed: boolean
} {
  // Keep parity with Taxation for future-proofing
  return { doc, changed: false }
}

function ensureDebtorsAttachments(doc: SimpleScheduleDocV1): {
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

  ensure('ar-ledger', 'A/R ledger listing')
  ensure('post-year-end', 'Post year-end receipts / bank support')
  ensure('bad-debt', 'Bad debt / provisions support')

  if (changed) next.attachments = existing
  return { doc: next, changed }
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

export async function getDebtorsScheduleAction(input: {
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
      .select({
        id: planningDocs.id,
        contentJson: planningDocs.contentJson
      })
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

    let current: SimpleScheduleDocV1 = normalized ?? debtorsDefault

    const ensuredTotals = ensureDebtorsTotals(current)
    current = ensuredTotals.doc

    const ensuredAttachments = ensureDebtorsAttachments(current)
    current = ensuredAttachments.doc

    if (existing && (ensuredTotals.changed || ensuredAttachments.changed)) {
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
        priorDoc = ensureDebtorsTotals(priorDoc).doc
        priorDoc = ensureDebtorsAttachments(priorDoc).doc
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
        e instanceof Error ? e.message : 'Failed to load debtors schedule'
    }
  }
}

export async function saveDebtorsScheduleAction(input: {
  clientId: string
  periodId: string
  doc: SimpleScheduleDocV1
}): Promise<ActionResult<null>> {
  try {
    const { clientId, periodId } = input

    const ensuredTotals = ensureDebtorsTotals(input.doc)
    let docToSave = ensuredTotals.doc

    const ensuredAttachments = ensureDebtorsAttachments(docToSave)
    docToSave = ensuredAttachments.doc

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
        set: {
          content: '',
          contentJson: docToSave,
          isComplete: false
        }
      })

    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/sales-debtors`
    )

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error ? e.message : 'Failed to save debtors schedule'
    }
  }
}
