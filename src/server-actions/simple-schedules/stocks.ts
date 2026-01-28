'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { stocksDefault } from '@/lib/schedules/templates/stocks'
import type {
  SimpleScheduleDocV1,
  ScheduleLine,
  ScheduleLineUi,
  ScheduleSectionUi
} from '@/lib/schedules/simpleScheduleTypes'

const CODE = 'B61-stocks'

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

function ensureStocksTotals(doc: SimpleScheduleDocV1): {
  doc: SimpleScheduleDocV1
  changed: boolean
} {
  let changed = false

  const SECTION_ID = 'summary'
  const TOTAL_ID = 'stocks-total'
  const SUM_OF = [
    'finished-goods',
    'work-in-progress',
    'raw-materials'
  ] as const

  const next: SimpleScheduleDocV1 = {
    ...doc,
    sections: doc.sections.map(s => ({ ...s, lines: [...s.lines] }))
  }

  const idx = next.sections.findIndex(s => s.id === SECTION_ID)
  if (idx === -1) return { doc: next, changed: false }

  const section = next.sections[idx]
  const lines = section.lines

  const totalIdx = lines.findIndex(l => l.id === TOTAL_ID)
  if (totalIdx === -1) {
    section.lines.push({
      kind: 'TOTAL',
      id: TOTAL_ID,
      label: 'Total stock value',
      sumOf: [...SUM_OF],
      ui: { emphasis: 'strong', tone: 'info' }
    })
    changed = true
    return { doc: next, changed }
  }

  const existing = lines[totalIdx]
  if (existing.kind !== 'TOTAL') {
    section.lines[totalIdx] = {
      kind: 'TOTAL',
      id: TOTAL_ID,
      label: 'Total stock value',
      sumOf: [...SUM_OF],
      ui: { emphasis: 'strong', tone: 'info' }
    }
    changed = true
    return { doc: next, changed }
  }

  const existingSumOf = Array.isArray(existing.sumOf) ? existing.sumOf : []
  const needsSumOf =
    existingSumOf.length !== SUM_OF.length ||
    existingSumOf.some((v, i) => v !== SUM_OF[i])

  const needsLabel = existing.label !== 'Total stock value'
  const needsUi =
    !existing.ui ||
    existing.ui.emphasis !== 'strong' ||
    existing.ui.tone !== 'info'

  if (needsSumOf || needsLabel || needsUi) {
    section.lines[totalIdx] = {
      ...existing,
      label: 'Total stock value',
      sumOf: [...SUM_OF],
      ui: { emphasis: 'strong', tone: 'info' }
    }
    changed = true
  }

  return { doc: next, changed }
}

function ensureStocksAttachments(doc: SimpleScheduleDocV1): {
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

  ensure('finished-goods', 'Finished goods')
  ensure('work-in-progress', 'Work in progress')
  ensure('raw-materials', 'Raw materials')

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

export async function getStocksScheduleAction(input: {
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

    let current: SimpleScheduleDocV1 = normalized ?? stocksDefault

    const ensuredTotals = ensureStocksTotals(current)
    current = ensuredTotals.doc

    const ensuredAttachments = ensureStocksAttachments(current)
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
        priorDoc = ensureStocksTotals(priorDoc).doc
        priorDoc = ensureStocksAttachments(priorDoc).doc
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
      message: e instanceof Error ? e.message : 'Failed to load stocks schedule'
    }
  }
}

export async function saveStocksScheduleAction(input: {
  clientId: string
  periodId: string
  doc: SimpleScheduleDocV1
}): Promise<ActionResult<null>> {
  try {
    const { clientId, periodId } = input

    const ensuredTotals = ensureStocksTotals(input.doc)
    let docToSave = ensuredTotals.doc

    const ensuredAttachments = ensureStocksAttachments(docToSave)
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
        set: { content: '', contentJson: docToSave, isComplete: false }
      })

    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/stocks`
    )

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to save stocks schedule'
    }
  }
}
