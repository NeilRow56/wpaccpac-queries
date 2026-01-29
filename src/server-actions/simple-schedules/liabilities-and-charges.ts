'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'

import type {
  SimpleScheduleDocV1,
  ScheduleLine,
  ScheduleLineUi,
  ScheduleSectionUi
} from '@/lib/schedules/simpleScheduleTypes'
import { liabilitiesAndChargesDefault } from '@/lib/schedules/templates/liabilities-and-charges'

const CODE = 'B61-liabilities_and_charges'
const TAX_CODE = 'B61-taxation'

// Liabilities & charges schedule line ids
const LINE_IDS = {
  bf: 'bf-balance',
  openingAdj: 'opening-adjustment',
  tcMovement: 'tc-movement', // ✅ renamed from tax-movement
  otherMovement: 'other-movement',
  taxPeriodEndBalance: 'tax-period-end-balance'
} as const

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

function getInputAmount(
  doc: SimpleScheduleDocV1,
  lineId: string
): number | null {
  for (const s of doc.sections) {
    for (const l of s.lines) {
      if (l.id !== lineId) continue
      if (l.kind === 'INPUT') return l.amount ?? null
      return null // CALC/TOTAL are computed in UI
    }
  }
  return null
}

function setInputAmount(
  doc: SimpleScheduleDocV1,
  lineId: string,
  amount: number | null
): { doc: SimpleScheduleDocV1; changed: boolean } {
  let changed = false
  const next: SimpleScheduleDocV1 = {
    ...doc,
    sections: doc.sections.map(s => ({ ...s, lines: [...s.lines] }))
  }

  for (const section of next.sections) {
    const idx = section.lines.findIndex(l => l.id === lineId)
    if (idx === -1) continue

    const line = section.lines[idx]
    if (line.kind !== 'INPUT') return { doc: next, changed }

    if (line.amount !== amount) {
      section.lines[idx] = { ...line, amount }
      changed = true
    }
    return { doc: next, changed }
  }

  return { doc: next, changed }
}

function safeNum(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function calcTaxChargeFromTaxationDoc(taxDoc: SimpleScheduleDocV1): number {
  const ctCurrent = safeNum(getInputAmount(taxDoc, 'ct-current'))
  const overUnder = safeNum(getInputAmount(taxDoc, 'ct-overunder'))
  const dtCharge = safeNum(getInputAmount(taxDoc, 'dt-charge'))
  return ctCurrent + overUnder + dtCharge
}

function calcTaxPeriodEndBalanceFromTaxationDoc(
  taxDoc: SimpleScheduleDocV1
): number {
  const ctPayable = safeNum(getInputAmount(taxDoc, 'ct-payable'))
  const dtBalance = safeNum(getInputAmount(taxDoc, 'dt-balance'))
  return ctPayable + dtBalance
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

async function readScheduleDoc(
  clientId: string,
  periodId: string,
  code: string
): Promise<{ id: string; doc: SimpleScheduleDocV1 } | null> {
  const row = await db
    .select({ id: planningDocs.id, contentJson: planningDocs.contentJson })
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

  if (!row?.contentJson) return null
  const doc = normalizeToV1WithKinds(row.contentJson)
  if (!doc) return null
  return { id: row.id, doc }
}

/**
 * Migration / normalisation: rename old line id "tax-movement" -> "tc-movement"
 * and fix up any references (CALC add/subtract, TOTAL sumOf).
 */
function renameLineIdInDoc(
  doc: SimpleScheduleDocV1,
  fromId: string,
  toId: string
): { doc: SimpleScheduleDocV1; changed: boolean } {
  let changed = false
  const next: SimpleScheduleDocV1 = {
    ...doc,
    sections: doc.sections.map(s => ({ ...s, lines: [...s.lines] }))
  }

  for (const section of next.sections) {
    section.lines = section.lines.map(line => {
      if (line.id === fromId) {
        changed = true
        return { ...line, id: toId } as ScheduleLine
      }

      if (line.kind === 'TOTAL') {
        const sumOf = line.sumOf.map(x => (x === fromId ? toId : x))
        if (sumOf.some((v, i) => v !== line.sumOf[i])) {
          changed = true
          return { ...line, sumOf }
        }
      }

      if (line.kind === 'CALC') {
        const add = line.add.map(x => (x === fromId ? toId : x))
        const subtract = (line.subtract ?? []).map(x =>
          x === fromId ? toId : x
        )

        const addChanged = add.some((v, i) => v !== line.add[i])
        const subChanged =
          (line.subtract ?? []).length !== subtract.length ||
          subtract.some((v, i) => v !== (line.subtract ?? [])[i])

        if (addChanged || subChanged) {
          changed = true
          return {
            ...line,
            add,
            ...(line.subtract ? { subtract } : {})
          }
        }
      }

      return line
    })
  }

  return { doc: next, changed }
}

function inferPriorClosingBalance(priorDoc: SimpleScheduleDocV1): number {
  // Closing balance is derived from INPUTs only (TOTAL/CALC aren't stored)
  const bf = safeNum(getInputAmount(priorDoc, LINE_IDS.bf))
  const openingAdj = safeNum(getInputAmount(priorDoc, LINE_IDS.openingAdj))
  const tcMove = safeNum(getInputAmount(priorDoc, LINE_IDS.tcMovement))
  const otherMove = safeNum(getInputAmount(priorDoc, LINE_IDS.otherMovement))
  return bf + openingAdj + tcMove + otherMove
}

async function seedDerivedValues(params: {
  clientId: string
  periodId: string
  current: SimpleScheduleDocV1
}): Promise<{
  doc: SimpleScheduleDocV1
  changed: boolean
  priorDoc: SimpleScheduleDocV1 | null
}> {
  const { clientId, periodId } = params
  let doc = params.current
  let changed = false

  // 1) Seed BF from prior period closing
  const { prior } = await getPriorPeriod(clientId, periodId)
  let priorDoc: SimpleScheduleDocV1 | null = null

  if (prior) {
    const priorRow = await readScheduleDoc(clientId, prior.id, CODE)
    if (priorRow) {
      priorDoc = priorRow.doc

      // normalize prior doc too (in case it still has tax-movement)
      const priorRenamed = renameLineIdInDoc(
        priorDoc,
        'tax-movement',
        LINE_IDS.tcMovement
      )
      priorDoc = priorRenamed.doc

      const priorClosing = inferPriorClosingBalance(priorDoc)
      const bfRes = setInputAmount(doc, LINE_IDS.bf, priorClosing)
      doc = bfRes.doc
      changed = changed || bfRes.changed
    }
  }

  // 2) Transfer from taxation schedule
  const taxRow = await readScheduleDoc(clientId, periodId, TAX_CODE)
  if (taxRow) {
    const taxMove = calcTaxChargeFromTaxationDoc(taxRow.doc)
    const taxBal = calcTaxPeriodEndBalanceFromTaxationDoc(taxRow.doc)

    const moveRes = setInputAmount(doc, LINE_IDS.tcMovement, taxMove)
    doc = moveRes.doc
    changed = changed || moveRes.changed

    const balRes = setInputAmount(doc, LINE_IDS.taxPeriodEndBalance, taxBal)
    doc = balRes.doc
    changed = changed || balRes.changed
  }

  return { doc, changed, priorDoc }
}

export async function getLiabilitiesAndChargesScheduleAction(input: {
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

    let current: SimpleScheduleDocV1 =
      normalized ?? liabilitiesAndChargesDefault

    // Normalize legacy ids in current doc (tax-movement -> tc-movement)
    const renamed = renameLineIdInDoc(
      current,
      'tax-movement',
      LINE_IDS.tcMovement
    )
    current = renamed.doc

    // Seed BF + taxation transfer
    const seeded = await seedDerivedValues({ clientId, periodId, current })
    current = seeded.doc
    const shouldPersist = (seeded.changed || renamed.changed) && !!existing

    if (shouldPersist) {
      await db
        .update(planningDocs)
        .set({ contentJson: current })
        .where(eq(planningDocs.id, existing!.id))
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
      const priorRow = await readScheduleDoc(clientId, prior.id, CODE)
      priorDoc = priorRow?.doc ?? null

      if (priorDoc) {
        priorDoc = renameLineIdInDoc(
          priorDoc,
          'tax-movement',
          LINE_IDS.tcMovement
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
          : 'Failed to load liabilities and charges schedule'
    }
  }
}

export async function saveLiabilitiesAndChargesScheduleAction(input: {
  clientId: string
  periodId: string
  doc: SimpleScheduleDocV1
}): Promise<ActionResult<null>> {
  try {
    const { clientId, periodId } = input

    // Normalize legacy ids before seeding/saving
    let docToSave = renameLineIdInDoc(
      input.doc,
      'tax-movement',
      LINE_IDS.tcMovement
    ).doc

    // Re-seed derived lines on save to prevent drift (BF + Tax transfer)
    const seeded = await seedDerivedValues({
      clientId,
      periodId,
      current: docToSave
    })

    docToSave = seeded.doc

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
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/liabilities-and-charges`
    )

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error
          ? e.message
          : 'Failed to save liabilities and charges schedule'
    }
  }
}
