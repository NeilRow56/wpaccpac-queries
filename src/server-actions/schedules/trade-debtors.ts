'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { tradeDebtorsDefault } from '@/lib/schedules/templates/trade-debtors'
import type {
  LineItemScheduleDocV1,
  LineItemScheduleRowV1
} from '@/lib/schedules/lineItemScheduleTypes'
import { resetLineItemScheduleForNewPeriod } from '@/lib/schedules/reset-line-item-schedule'

// Keep consistent with your pattern: CODE is the planningDocs.code value
const CODE = 'B61-trade_debtors'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function normalizeDoc(raw: unknown): LineItemScheduleDocV1 | null {
  if (!isRecord(raw)) return null
  if (raw.kind !== 'LINE_ITEM_SCHEDULE' || raw.version !== 1) return null
  if (typeof raw.title !== 'string') return null
  if (!Array.isArray(raw.rows)) return null

  const rows: LineItemScheduleRowV1[] = raw.rows.filter(isRecord).map(r => ({
    id: typeof r.id === 'string' ? r.id : crypto.randomUUID(),
    name: typeof r.name === 'string' ? r.name : 'Line',
    description: typeof r.description === 'string' ? r.description : '',
    current:
      r.current === null || typeof r.current === 'number' ? r.current : null,
    prior: r.prior === null || typeof r.prior === 'number' ? r.prior : null
  }))

  return {
    kind: 'LINE_ITEM_SCHEDULE',
    version: 1,
    title: raw.title,
    rows
  }
}

function sum(rows: LineItemScheduleRowV1[], key: 'current' | 'prior') {
  return rows.reduce((acc, r) => acc + (r[key] ?? 0), 0)
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

export async function getTradeDebtorsScheduleAction(input: {
  clientId: string
  periodId: string
}): Promise<
  ActionResult<{
    current: LineItemScheduleDocV1
    prior: LineItemScheduleDocV1 | null
    totals: { current: number; prior: number }
    priorPeriod: { startDate: string; endDate: string } | null
  }>
> {
  try {
    const { clientId, periodId } = input

    // 1) Read existing current-period doc (if any)
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

    const normalizedCurrent = existing?.contentJson
      ? normalizeDoc(existing.contentJson)
      : null

    // 2) Load prior period + prior doc (needed for comparatives + seeding)
    const { prior } = await getPriorPeriod(clientId, periodId)

    let priorDoc: LineItemScheduleDocV1 | null = null
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
        ? normalizeDoc(priorRow.contentJson)
        : null
    }

    // 3) Decide current doc
    let current: LineItemScheduleDocV1
    if (normalizedCurrent) {
      current = normalizedCurrent
    } else {
      // ✅ Seed from prior structure (preserve row ids) so prior mapping works
      current = priorDoc
        ? resetLineItemScheduleForNewPeriod(priorDoc)
        : tradeDebtorsDefault

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

    return {
      success: true,
      data: {
        current,
        prior: priorDoc,
        totals: {
          current: sum(current.rows, 'current'),
          prior: sum(priorDoc?.rows ?? [], 'current') // prior-year current
        },
        priorPeriod: prior
          ? { startDate: prior.startDate, endDate: prior.endDate }
          : null
      }
    }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error ? e.message : 'Failed to load trade debtors schedule'
    }
  }
}

export async function saveTradeDebtorsScheduleAction(input: {
  clientId: string
  periodId: string
  doc: LineItemScheduleDocV1
}): Promise<ActionResult<null>> {
  try {
    const { clientId, periodId, doc } = input

    await db
      .insert(planningDocs)
      .values({
        clientId,
        periodId,
        code: CODE,
        content: '',
        contentJson: doc,
        isComplete: false
      })
      .onConflictDoUpdate({
        target: [
          planningDocs.clientId,
          planningDocs.periodId,
          planningDocs.code
        ],
        set: { content: '', contentJson: doc, isComplete: false }
      })

    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/sales-debtors`
    )
    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/sales-debtors/trade-debtors`
    )

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error ? e.message : 'Failed to save trade debtors schedule'
    }
  }
}
