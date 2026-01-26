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
import type {
  LineItemScheduleDocV1,
  LineItemScheduleRowV1
} from '@/lib/schedules/lineItemScheduleTypes'

const DEBTORS_CODE = 'B61-debtors'
const PREPAYMENTS_CODE = 'B61-debtors_prepayments'
const PREPAYMENTS_LINE_ID_IN_DEBTORS = 'prepayments'

// ✅ NEW: Trade Debtors
const TRADE_DEBTORS_CODE = 'B61-trade_debtors'
const TRADE_DEBTORS_LINE_ID_IN_DEBTORS = 'trade-debtors'

// ✅ NEW: Other Debtors
const OTHER_DEBTORS_CODE = 'B61-other_debtors'
const OTHER_DEBTORS_LINE_ID_IN_DEBTORS = 'other-debtors'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

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

function sumLineItem(rows: LineItemScheduleRowV1[], key: 'current' | 'prior') {
  return rows.reduce((acc, r) => acc + (r[key] ?? 0), 0)
}

function injectDerivedAmount(
  doc: SimpleScheduleDocV1,
  lineId: string,
  amount: number
): { doc: SimpleScheduleDocV1; changed: boolean } {
  let changed = false

  const next: SimpleScheduleDocV1 = {
    ...doc,
    sections: doc.sections.map(s => ({ ...s, lines: [...s.lines] }))
  }

  const safeAmt = Number.isFinite(amount) ? amount : 0

  for (const section of next.sections) {
    section.lines = section.lines.map(l => {
      if (l.kind !== 'INPUT' || l.id !== lineId) return l
      if ((l.amount ?? null) !== safeAmt) changed = true
      return { ...l, amount: safeAmt }
    })
  }

  return { doc: next, changed }
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
  let changed = false

  const SUMMARY_SECTION_ID = 'summary'
  const LEGACY_TOTAL_ID = 'debtors-total'
  const GROSS_TOTAL_ID = 'debtors-gross-total'
  const NET_TOTAL_ID = 'debtors-net-total'

  const GROSS_SUM_OF = [
    'trade-debtors',
    'other-debtors',
    'prepayments'
  ] as const

  const next: SimpleScheduleDocV1 = {
    ...doc,
    sections: doc.sections.map(s => ({ ...s, lines: [...s.lines] }))
  }

  const summaryIdx = next.sections.findIndex(s => s.id === SUMMARY_SECTION_ID)
  if (summaryIdx === -1) return { doc, changed: false }

  const summary = next.sections[summaryIdx]
  const lines = summary.lines

  const hasId = (id: string) => lines.some(l => l.id === id)

  // 1) Upgrade legacy total -> gross total
  if (hasId(LEGACY_TOTAL_ID) && !hasId(GROSS_TOTAL_ID)) {
    summary.lines = summary.lines.map(l => {
      if (l.id !== LEGACY_TOTAL_ID) return l
      if (l.kind !== 'TOTAL') return l

      changed = true
      return {
        ...l,
        id: GROSS_TOTAL_ID,
        label: 'Debtors total (gross)',
        sumOf: [...GROSS_SUM_OF],
        ui: l.ui ?? { emphasis: 'strong', tone: 'info' }
      }
    })
  }

  // 2) Ensure gross total exists (if neither legacy nor gross exists)
  if (!hasId(GROSS_TOTAL_ID) && !hasId(LEGACY_TOTAL_ID)) {
    summary.lines.push({
      kind: 'TOTAL',
      id: GROSS_TOTAL_ID,
      label: 'Debtors total (gross)',
      sumOf: [...GROSS_SUM_OF],
      ui: { emphasis: 'strong', tone: 'info' }
    })
    changed = true
  }

  // If legacy total still exists (because it wasn't TOTAL), remove it to avoid confusion
  if (hasId(LEGACY_TOTAL_ID) && hasId(GROSS_TOTAL_ID)) {
    const before = summary.lines.length
    summary.lines = summary.lines.filter(l => l.id !== LEGACY_TOTAL_ID)
    if (summary.lines.length !== before) changed = true
  }

  // 3) Ensure net total exists
  if (!hasId(NET_TOTAL_ID)) {
    summary.lines.push({
      kind: 'CALC',
      id: NET_TOTAL_ID,
      label: 'Debtors total (net)',
      add: [...GROSS_SUM_OF],
      subtract: ['bad-debt-provision'],
      notes: 'Net of provision for doubtful debts.',
      ui: { emphasis: 'strong', tone: 'info' } // line UI cannot be "primary"
    })
    changed = true
  }

  return { doc: next, changed }
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

async function readPrepaymentsTotalCurrent(params: {
  clientId: string
  periodId: string
}): Promise<number> {
  const { clientId, periodId } = params

  const row = await db
    .select({ contentJson: planningDocs.contentJson })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, clientId),
        eq(planningDocs.periodId, periodId),
        eq(planningDocs.code, PREPAYMENTS_CODE)
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  const doc = row?.contentJson
    ? normalizeLineItemSchedule(row.contentJson)
    : null
  return doc ? sumLineItem(doc.rows, 'current') : 0
}

// ✅ NEW: Trade Debtors total reader (same as Prepayments)
async function readTradeDebtorsTotalCurrent(params: {
  clientId: string
  periodId: string
}): Promise<number> {
  const { clientId, periodId } = params

  const row = await db
    .select({ contentJson: planningDocs.contentJson })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, clientId),
        eq(planningDocs.periodId, periodId),
        eq(planningDocs.code, TRADE_DEBTORS_CODE)
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  const doc = row?.contentJson
    ? normalizeLineItemSchedule(row.contentJson)
    : null
  return doc ? sumLineItem(doc.rows, 'current') : 0
}

// ✅ NEW: Other Debtors total reader (same as Prepayments)
async function readOtherDebtorsTotalCurrent(params: {
  clientId: string
  periodId: string
}): Promise<number> {
  const { clientId, periodId } = params

  const row = await db
    .select({ contentJson: planningDocs.contentJson })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, clientId),
        eq(planningDocs.periodId, periodId),
        eq(planningDocs.code, OTHER_DEBTORS_CODE)
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  const doc = row?.contentJson
    ? normalizeLineItemSchedule(row.contentJson)
    : null
  return doc ? sumLineItem(doc.rows, 'current') : 0
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
          eq(planningDocs.code, DEBTORS_CODE)
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

    // ✅ Inject derived Prepayments total into CURRENT doc
    const prepayTotalCurrent = await readPrepaymentsTotalCurrent({
      clientId,
      periodId
    })
    const injectedCurrentPrepay = injectDerivedAmount(
      current,
      PREPAYMENTS_LINE_ID_IN_DEBTORS,
      prepayTotalCurrent
    )
    current = injectedCurrentPrepay.doc

    // ✅ Inject derived Trade Debtors total into CURRENT doc
    const tradeDebtorsTotalCurrent = await readTradeDebtorsTotalCurrent({
      clientId,
      periodId
    })
    const injectedCurrentTrade = injectDerivedAmount(
      current,
      TRADE_DEBTORS_LINE_ID_IN_DEBTORS,
      tradeDebtorsTotalCurrent
    )
    current = injectedCurrentTrade.doc
    // ✅ Inject derived Other Debtors total into CURRENT doc
    const otherDebtorsTotalCurrent = await readOtherDebtorsTotalCurrent({
      clientId,
      periodId
    })
    const injectedCurrentOtherDebtors = injectDerivedAmount(
      current,
      OTHER_DEBTORS_LINE_ID_IN_DEBTORS,
      otherDebtorsTotalCurrent
    )
    current = injectedCurrentOtherDebtors.doc

    // Persist patches when we actually changed something and there is an existing row
    if (
      existing &&
      (ensuredTotals.changed ||
        ensuredAttachments.changed ||
        injectedCurrentPrepay.changed ||
        injectedCurrentTrade.changed ||
        injectedCurrentOtherDebtors.changed)
    ) {
      await db
        .update(planningDocs)
        .set({ contentJson: current })
        .where(eq(planningDocs.id, existing.id))
    }

    // Seed if missing (stable subsequent loads)
    if (!existing) {
      await db
        .insert(planningDocs)
        .values({
          clientId,
          periodId,
          code: DEBTORS_CODE,
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
            eq(planningDocs.code, DEBTORS_CODE)
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

        // ✅ Inject derived totals into PRIOR doc
        // Prior column shows last year’s CURRENT values

        const prepayPriorTotalAsPriorColumn = await readPrepaymentsTotalCurrent(
          {
            clientId,
            periodId: prior.id
          }
        )
        priorDoc = injectDerivedAmount(
          priorDoc,
          PREPAYMENTS_LINE_ID_IN_DEBTORS,
          prepayPriorTotalAsPriorColumn
        ).doc

        const tradeDebtorsPriorTotalAsPriorColumn =
          await readTradeDebtorsTotalCurrent({
            clientId,
            periodId: prior.id
          })
        priorDoc = injectDerivedAmount(
          priorDoc,
          TRADE_DEBTORS_LINE_ID_IN_DEBTORS,
          tradeDebtorsPriorTotalAsPriorColumn
        ).doc
        const otherDebtorsPriorTotalAsPriorColumn =
          await readOtherDebtorsTotalCurrent({
            clientId,
            periodId: prior.id
          })
        priorDoc = injectDerivedAmount(
          priorDoc,
          OTHER_DEBTORS_LINE_ID_IN_DEBTORS,
          otherDebtorsPriorTotalAsPriorColumn
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

    // ✅ Force derived values on save (single source of truth)

    const prepayTotalCurrent = await readPrepaymentsTotalCurrent({
      clientId,
      periodId
    })
    docToSave = injectDerivedAmount(
      docToSave,
      PREPAYMENTS_LINE_ID_IN_DEBTORS,
      prepayTotalCurrent
    ).doc

    const tradeDebtorsTotalCurrent = await readTradeDebtorsTotalCurrent({
      clientId,
      periodId
    })
    docToSave = injectDerivedAmount(
      docToSave,
      TRADE_DEBTORS_LINE_ID_IN_DEBTORS,
      tradeDebtorsTotalCurrent
    ).doc

    const otherDebtorsTotalCurrent = await readOtherDebtorsTotalCurrent({
      clientId,
      periodId
    })
    docToSave = injectDerivedAmount(
      docToSave,
      OTHER_DEBTORS_LINE_ID_IN_DEBTORS,
      otherDebtorsTotalCurrent
    ).doc

    await db
      .insert(planningDocs)
      .values({
        clientId,
        periodId,
        code: DEBTORS_CODE,
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
