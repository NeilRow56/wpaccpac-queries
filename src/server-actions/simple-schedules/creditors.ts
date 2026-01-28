'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { creditorsDefault } from '@/lib/schedules/templates/creditors'
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

const CREDITORS_CODE = 'B61-creditors'

// Line item schedule codes to derive from
const TRADE_CREDITORS_CODE = 'B61-trade_creditors'
const VAT_OTHER_TAXES_CODE = 'B61-creditors_vat_other_taxes'
const ACCRUALS_DEFERRED_INCOME_CODE = 'B61-creditors_accruals_deferred_income'

// Line ids in creditors lead schedule
const TRADE_CREDITORS_LINE_ID_IN_CREDITORS = 'trade-creditors'
const VAT_OTHER_TAXES_LINE_ID_IN_CREDITORS = 'vat-paye-nic'
const ACCRUALS_DEFERRED_INCOME_LINE_ID_IN_CREDITORS = 'accruals-deferred-income'

// Taxation → corp tax payable
const TAXATION_CODE = 'B61-taxation'
const CT_PAYABLE_LINE_ID_IN_TAXATION = 'ct-payable'
const CT_PAYABLE_LINE_ID_IN_CREDITORS = 'corp-tax-payable'

async function readCorpTaxPayablePositiveOnly(params: {
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
        eq(planningDocs.code, TAXATION_CODE)
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  const doc = row?.contentJson ? normalizeToV1WithKinds(row.contentJson) : null
  if (!doc) return 0

  let amt: number | null = null
  for (const section of doc.sections) {
    for (const line of section.lines) {
      if (line.kind === 'INPUT' && line.id === CT_PAYABLE_LINE_ID_IN_TAXATION) {
        amt = line.amount ?? null
      }
    }
  }

  const n = typeof amt === 'number' && Number.isFinite(amt) ? amt : 0
  return n > 0 ? n : 0
}

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

function ensureCreditorsTotals(doc: SimpleScheduleDocV1): {
  doc: SimpleScheduleDocV1
  changed: boolean
} {
  let changed = false

  const WITHIN_SECTION_ID = 'summary'
  const LONG_TERM_SECTION_ID = 'long-term-summary'

  const WITHIN_TOTAL_ID = 'creditors-gross-total'
  const LONG_TERM_TOTAL_ID = 'creditors-long-term-gross-total'

  const WITHIN_SUM_OF = [
    'trade-creditors',
    'corp-tax-payable',
    'vat-paye-nic',
    'accruals-deferred-income',
    'dividends-payable',
    'directors-loans-balance',
    'loans-within-one-year'
  ] as const

  const LONG_TERM_SUM_OF = [
    'loans-more-than-one-year',
    'other-long-term-creditors'
  ] as const

  const next: SimpleScheduleDocV1 = {
    ...doc,
    sections: doc.sections.map(s => ({ ...s, lines: [...s.lines] }))
  }

  const ensureSectionTotal = (
    sectionId: string,
    totalId: string,
    label: string,
    sumOf: readonly string[]
  ) => {
    const idx = next.sections.findIndex(s => s.id === sectionId)
    if (idx === -1) return

    const section = next.sections[idx]
    const lines = section.lines

    const totalIdx = lines.findIndex(l => l.id === totalId)

    if (totalIdx === -1) {
      section.lines.push({
        kind: 'TOTAL',
        id: totalId,
        label,
        sumOf: [...sumOf],
        ui: { emphasis: 'strong', tone: 'info' }
      })
      changed = true
      return
    }

    const existing = lines[totalIdx]
    if (existing.kind !== 'TOTAL') {
      section.lines[totalIdx] = {
        kind: 'TOTAL',
        id: totalId,
        label,
        sumOf: [...sumOf],
        ui: { emphasis: 'strong', tone: 'info' }
      }
      changed = true
      return
    }

    const needsLabel = existing.label !== label
    const existingSumOf = Array.isArray(existing.sumOf) ? existing.sumOf : []
    const needsSumOf =
      existingSumOf.length !== sumOf.length ||
      existingSumOf.some((v, i) => v !== sumOf[i])

    const needsUi =
      !existing.ui ||
      existing.ui.emphasis !== 'strong' ||
      existing.ui.tone !== 'info'

    if (needsLabel || needsSumOf || needsUi) {
      section.lines[totalIdx] = {
        ...existing,
        kind: 'TOTAL',
        id: totalId,
        label,
        sumOf: [...sumOf],
        ui: { emphasis: 'strong', tone: 'info' }
      }
      changed = true
    }
  }

  ensureSectionTotal(
    WITHIN_SECTION_ID,
    WITHIN_TOTAL_ID,
    'Creditors falling due within one year - total',
    WITHIN_SUM_OF
  )

  ensureSectionTotal(
    LONG_TERM_SECTION_ID,
    LONG_TERM_TOTAL_ID,
    'Creditors falling due in more than one year - total',
    LONG_TERM_SUM_OF
  )

  return { doc: next, changed }
}

function ensureCreditorsAttachments(doc: SimpleScheduleDocV1): {
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

  ensure('purc-ledger', 'Trade creditor listing')
  ensure('post-year-end', 'Post year-end payments / bank support')
  ensure('directors-loans', 'Directors Loans support')

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

async function readLineItemScheduleTotalCurrent(params: {
  clientId: string
  periodId: string
  code: string
}): Promise<number> {
  const { clientId, periodId, code } = params

  const row = await db
    .select({ contentJson: planningDocs.contentJson })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, clientId),
        eq(planningDocs.periodId, periodId),
        eq(planningDocs.code, code)
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  const doc = row?.contentJson
    ? normalizeLineItemSchedule(row.contentJson)
    : null
  return doc ? sumLineItem(doc.rows, 'current') : 0
}

export async function getCreditorsScheduleAction(input: {
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
          eq(planningDocs.code, CREDITORS_CODE)
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    const normalized = existing?.contentJson
      ? normalizeToV1WithKinds(existing.contentJson)
      : null

    let current: SimpleScheduleDocV1 = normalized ?? creditorsDefault

    const ensuredTotals = ensureCreditorsTotals(current)
    current = ensuredTotals.doc

    const ensuredAttachments = ensureCreditorsAttachments(current)
    current = ensuredAttachments.doc

    const tradeCreditorsTotalCurrent = await readLineItemScheduleTotalCurrent({
      clientId,
      periodId,
      code: TRADE_CREDITORS_CODE
    })
    const injectedCurrentTradeCreditors = injectDerivedAmount(
      current,
      TRADE_CREDITORS_LINE_ID_IN_CREDITORS,
      tradeCreditorsTotalCurrent
    )
    current = injectedCurrentTradeCreditors.doc

    const vatOtherTaxesTotalCurrent = await readLineItemScheduleTotalCurrent({
      clientId,
      periodId,
      code: VAT_OTHER_TAXES_CODE
    })
    const injectedVatOtherTaxesCurrent = injectDerivedAmount(
      current,
      VAT_OTHER_TAXES_LINE_ID_IN_CREDITORS,
      vatOtherTaxesTotalCurrent
    )
    current = injectedVatOtherTaxesCurrent.doc

    const accrualsDeferredIncomeTotalCurrent =
      await readLineItemScheduleTotalCurrent({
        clientId,
        periodId,
        code: ACCRUALS_DEFERRED_INCOME_CODE
      })
    const injectedAccrualsDeferredIncomeCurrent = injectDerivedAmount(
      current,
      ACCRUALS_DEFERRED_INCOME_LINE_ID_IN_CREDITORS,
      accrualsDeferredIncomeTotalCurrent
    )
    current = injectedAccrualsDeferredIncomeCurrent.doc

    const corpTaxPayableCurrent = await readCorpTaxPayablePositiveOnly({
      clientId,
      periodId
    })
    const injectedCorpTaxCurrent = injectDerivedAmount(
      current,
      CT_PAYABLE_LINE_ID_IN_CREDITORS,
      corpTaxPayableCurrent
    )
    current = injectedCorpTaxCurrent.doc

    if (
      existing &&
      (ensuredTotals.changed ||
        ensuredAttachments.changed ||
        injectedCurrentTradeCreditors.changed ||
        injectedVatOtherTaxesCurrent.changed ||
        injectedAccrualsDeferredIncomeCurrent.changed ||
        injectedCorpTaxCurrent.changed)
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
          code: CREDITORS_CODE,
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
            eq(planningDocs.code, CREDITORS_CODE)
          )
        )
        .limit(1)
        .then(r => r[0] ?? null)

      priorDoc = priorRow?.contentJson
        ? normalizeToV1WithKinds(priorRow.contentJson)
        : null

      if (priorDoc) {
        priorDoc = ensureCreditorsTotals(priorDoc).doc
        priorDoc = ensureCreditorsAttachments(priorDoc).doc

        const tradeCreditorsPriorTotalAsPriorColumn =
          await readLineItemScheduleTotalCurrent({
            clientId,
            periodId: prior.id,
            code: TRADE_CREDITORS_CODE
          })
        priorDoc = injectDerivedAmount(
          priorDoc,
          TRADE_CREDITORS_LINE_ID_IN_CREDITORS,
          tradeCreditorsPriorTotalAsPriorColumn
        ).doc

        const vatOtherTaxesPriorTotalAsPriorColumn =
          await readLineItemScheduleTotalCurrent({
            clientId,
            periodId: prior.id,
            code: VAT_OTHER_TAXES_CODE
          })
        priorDoc = injectDerivedAmount(
          priorDoc,
          VAT_OTHER_TAXES_LINE_ID_IN_CREDITORS,
          vatOtherTaxesPriorTotalAsPriorColumn
        ).doc

        const accrualsDeferredIncomePriorTotalAsPriorColumn =
          await readLineItemScheduleTotalCurrent({
            clientId,
            periodId: prior.id,
            code: ACCRUALS_DEFERRED_INCOME_CODE
          })
        priorDoc = injectDerivedAmount(
          priorDoc,
          ACCRUALS_DEFERRED_INCOME_LINE_ID_IN_CREDITORS,
          accrualsDeferredIncomePriorTotalAsPriorColumn
        ).doc

        const corpTaxPayablePriorAsPriorColumn =
          await readCorpTaxPayablePositiveOnly({
            clientId,
            periodId: prior.id
          })
        priorDoc = injectDerivedAmount(
          priorDoc,
          CT_PAYABLE_LINE_ID_IN_CREDITORS,
          corpTaxPayablePriorAsPriorColumn
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
        e instanceof Error ? e.message : 'Failed to load creditors schedule'
    }
  }
}

export async function saveCreditorsScheduleAction(input: {
  clientId: string
  periodId: string
  doc: SimpleScheduleDocV1
}): Promise<ActionResult<null>> {
  try {
    const { clientId, periodId } = input

    const ensuredTotals = ensureCreditorsTotals(input.doc)
    let docToSave = ensuredTotals.doc

    const ensuredAttachments = ensureCreditorsAttachments(docToSave)
    docToSave = ensuredAttachments.doc

    const tradeCreditorsTotalCurrent = await readLineItemScheduleTotalCurrent({
      clientId,
      periodId,
      code: TRADE_CREDITORS_CODE
    })
    docToSave = injectDerivedAmount(
      docToSave,
      TRADE_CREDITORS_LINE_ID_IN_CREDITORS,
      tradeCreditorsTotalCurrent
    ).doc

    const vatOtherTaxesTotalCurrent = await readLineItemScheduleTotalCurrent({
      clientId,
      periodId,
      code: VAT_OTHER_TAXES_CODE
    })
    docToSave = injectDerivedAmount(
      docToSave,
      VAT_OTHER_TAXES_LINE_ID_IN_CREDITORS,
      vatOtherTaxesTotalCurrent
    ).doc

    const accrualsDeferredIncomeTotalCurrent =
      await readLineItemScheduleTotalCurrent({
        clientId,
        periodId,
        code: ACCRUALS_DEFERRED_INCOME_CODE
      })
    docToSave = injectDerivedAmount(
      docToSave,
      ACCRUALS_DEFERRED_INCOME_LINE_ID_IN_CREDITORS,
      accrualsDeferredIncomeTotalCurrent
    ).doc

    const corpTaxPayableCurrent = await readCorpTaxPayablePositiveOnly({
      clientId,
      periodId
    })
    docToSave = injectDerivedAmount(
      docToSave,
      CT_PAYABLE_LINE_ID_IN_CREDITORS,
      corpTaxPayableCurrent
    ).doc

    await db
      .insert(planningDocs)
      .values({
        clientId,
        periodId,
        code: CREDITORS_CODE,
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
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/purchases-creditors`
    )

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error ? e.message : 'Failed to save creditors schedule'
    }
  }
}
