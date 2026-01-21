'use server'

import { db } from '@/db'
import {
  accountingPeriods,
  fixedAssets,
  assetPeriodBalances,
  depreciationEntries
} from '@/db/schema'
import { and, desc, eq, lt } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import {
  calculateDaysInPeriod,
  calculatePeriodDepreciationFromBalances,
  type DepreciationMethod
} from '@/lib/asset-calculations'

/* -----------------------------
 * Local helpers
 * ----------------------------- */

function toNum(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v)
  return 0
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

function toDecStr(n: number): string {
  return round2(n).toFixed(2)
}

function assertDepreciationMethod(v: unknown): asserts v is DepreciationMethod {
  if (v !== 'straight_line' && v !== 'reducing_balance') {
    throw new Error(`Invalid depreciation method: ${String(v)}`)
  }
}

/**
 * tx type for Drizzle transaction callback.
 * Works with your `export const db = drizzle(pool, { schema })`.
 */
type Tx = Parameters<(typeof db)['transaction']>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never

function computeCostCfwd(b: {
  costBfwd: unknown
  additions: unknown
  disposalsCost: unknown
  costAdjustment: unknown
}) {
  return (
    toNum(b.costBfwd) +
    toNum(b.additions) -
    toNum(b.disposalsCost) +
    toNum(b.costAdjustment)
  )
}

function computeDepnCfwd(b: {
  depreciationBfwd: unknown
  depreciationCharge: unknown
  depreciationOnDisposals: unknown
  depreciationAdjustment: unknown
}) {
  return (
    toNum(b.depreciationBfwd) +
    toNum(b.depreciationCharge) -
    toNum(b.depreciationOnDisposals) +
    toNum(b.depreciationAdjustment)
  )
}

async function getCurrentAndPreviousPeriod(params: {
  clientId: string
  periodId: string
}) {
  const { clientId, periodId } = params

  const current = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.id, periodId),
      eq(accountingPeriods.clientId, clientId)
    )
  })
  if (!current) return null

  const prev = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.clientId, clientId),
      lt(accountingPeriods.endDate, current.startDate)
    ),
    orderBy: [desc(accountingPeriods.endDate)]
  })

  return { current, prev }
}

/**
 * Seed ONLY missing asset_period_balances rows for this period.
 * - BFWD from previous period's CFWD if prevPeriodId provided (otherwise 0)
 * - Movements start at 0
 * - Does not overwrite existing rows
 */
async function seedAssetPeriodBalancesTx(
  tx: Tx,
  input: { clientId: string; periodId: string; prevPeriodId: string | null }
) {
  const { clientId, periodId, prevPeriodId } = input

  const assets = await tx
    .select({ assetId: fixedAssets.id })
    .from(fixedAssets)
    .where(eq(fixedAssets.clientId, clientId))

  if (assets.length === 0) {
    return { seeded: 0 }
  }

  const bfwdByAsset = new Map<string, { costBfwd: string; depnBfwd: string }>()

  if (prevPeriodId) {
    const prevRows = await tx
      .select({
        assetId: assetPeriodBalances.assetId,

        costBfwd: assetPeriodBalances.costBfwd,
        additions: assetPeriodBalances.additions,
        disposalsCost: assetPeriodBalances.disposalsCost,
        costAdjustment: assetPeriodBalances.costAdjustment,

        depreciationBfwd: assetPeriodBalances.depreciationBfwd,
        depreciationCharge: assetPeriodBalances.depreciationCharge,
        depreciationOnDisposals: assetPeriodBalances.depreciationOnDisposals,
        depreciationAdjustment: assetPeriodBalances.depreciationAdjustment
      })
      .from(assetPeriodBalances)
      .where(eq(assetPeriodBalances.periodId, prevPeriodId))

    for (const r of prevRows) {
      bfwdByAsset.set(r.assetId, {
        costBfwd: toDecStr(computeCostCfwd(r)),
        depnBfwd: toDecStr(computeDepnCfwd(r))
      })
    }
  }

  const values = assets.map(a => {
    const bfwd = bfwdByAsset.get(a.assetId)
    return {
      assetId: a.assetId,
      periodId,

      costBfwd: bfwd?.costBfwd ?? '0',
      additions: '0',
      disposalsCost: '0',
      costAdjustment: '0',

      depreciationBfwd: bfwd?.depnBfwd ?? '0',
      depreciationCharge: '0',
      depreciationOnDisposals: '0',
      depreciationAdjustment: '0',

      disposalProceeds: '0'
    }
  })

  await tx
    .insert(assetPeriodBalances)
    .values(values)
    .onConflictDoNothing({
      target: [assetPeriodBalances.assetId, assetPeriodBalances.periodId]
    })

  // We can’t reliably know how many were inserted without RETURNING or a second query.
  // For UX, “done” is enough; for debugging, you can return assets.length.
  return { seeded: values.length }
}

/* -----------------------------
 * Action
 * ----------------------------- */

export async function recalculateDepreciationForPeriodAction(input: {
  clientId: string
  periodId: string
}) {
  const { clientId, periodId } = input

  const periods = await getCurrentAndPreviousPeriod({ clientId, periodId })
  if (!periods) return { success: false as const, error: 'Period not found' }

  const { current, prev } = periods

  if (current.status !== 'OPEN') {
    return {
      success: false as const,
      error: `Period is ${current.status}. Recalc is disabled.`
    }
  }

  const periodStartDate = new Date(String(current.startDate))
  const periodEndDate = new Date(String(current.endDate))

  const result = await db.transaction(async tx => {
    // ✅ Always seed missing rows first (safe + idempotent)
    await seedAssetPeriodBalancesTx(tx, {
      clientId,
      periodId,
      prevPeriodId: prev?.id ?? null
    })

    // Now balances should exist for all assets (if any assets exist)
    const rows = await tx
      .select({
        assetId: fixedAssets.id,
        acquisitionDate: fixedAssets.acquisitionDate,
        method: fixedAssets.depreciationMethod,
        rate: fixedAssets.depreciationRate,

        costBfwd: assetPeriodBalances.costBfwd,
        additions: assetPeriodBalances.additions,
        disposalsCost: assetPeriodBalances.disposalsCost,
        costAdjustment: assetPeriodBalances.costAdjustment,

        depreciationBfwd: assetPeriodBalances.depreciationBfwd
      })
      .from(fixedAssets)
      .innerJoin(
        assetPeriodBalances,
        and(
          eq(assetPeriodBalances.assetId, fixedAssets.id),
          eq(assetPeriodBalances.periodId, periodId)
        )
      )
      .where(eq(fixedAssets.clientId, clientId))

    if (rows.length === 0) {
      // no assets for this client
      return { updated: 0 }
    }

    let updated = 0

    for (const r of rows) {
      const openingCost = toNum(r.costBfwd)
      const additionsAtCost = toNum(r.additions)
      const disposalsAtCost = toNum(r.disposalsCost)
      const costAdjustmentForPeriod = toNum(r.costAdjustment)

      const openingAccumulatedDepreciation = toNum(r.depreciationBfwd)

      const depreciationRate = toNum(r.rate)
      const acquisitionDate = new Date(String(r.acquisitionDate))

      const daysInPeriod = calculateDaysInPeriod(
        periodStartDate,
        periodEndDate,
        acquisitionDate
      )

      assertDepreciationMethod(r.method)

      const charge = round2(
        calculatePeriodDepreciationFromBalances({
          openingCost,
          additionsAtCost,
          costAdjustmentForPeriod,
          disposalsAtCost,
          openingAccumulatedDepreciation,
          depreciationRate,
          method: r.method,
          periodStartDate,
          periodEndDate,
          acquisitionDate
        })
      )

      // 1) Audit trail: upsert one row per asset/period
      await tx
        .insert(depreciationEntries)
        .values({
          assetId: r.assetId,
          periodId,
          depreciationAmount: toDecStr(charge),
          daysInPeriod,
          rateUsed: toDecStr(depreciationRate)
        })
        .onConflictDoUpdate({
          target: [depreciationEntries.assetId, depreciationEntries.periodId],
          set: {
            depreciationAmount: toDecStr(charge),
            daysInPeriod,
            rateUsed: toDecStr(depreciationRate)
            // don’t touch createdAt here unless you truly mean “updatedAt”
          }
        })

      // 2) Schedule: write charge to balances (source of truth for the page)
      await tx
        .update(assetPeriodBalances)
        .set({
          depreciationCharge: toDecStr(charge)
        })
        .where(
          and(
            eq(assetPeriodBalances.assetId, r.assetId),
            eq(assetPeriodBalances.periodId, periodId)
          )
        )

      updated += 1
    }

    return { updated }
  })

  revalidatePath(
    `/organisation/clients/${clientId}/accounting-periods/${periodId}/assets`
  )

  return { success: true as const, updated: result.updated }
}
