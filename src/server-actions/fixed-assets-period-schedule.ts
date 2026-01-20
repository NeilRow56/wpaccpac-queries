// src/server-actions/fixed-assets-period-schedule.ts
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
  calculatePeriodDepreciationFromBalances
} from '@/lib/asset-calculations'

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
 * Seed asset_period_balances rows for a period.
 * - Inserts rows for ALL fixed assets for the client (if missing)
 * - Rolls forward opening balances from previous period (if any)
 * - Leaves existing rows untouched
 */
export async function seedAssetPeriodBalancesAction(input: {
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
      error: `Period is ${current.status}. Generate schedule is disabled.`
    }
  }

  return await db.transaction(async tx => {
    const assets = await tx
      .select({ assetId: fixedAssets.id })
      .from(fixedAssets)
      .where(eq(fixedAssets.clientId, clientId))

    if (assets.length === 0) {
      revalidatePath(
        `/organisation/clients/${clientId}/accounting-periods/${periodId}/assets`
      )
      return {
        success: true as const,
        seeded: 0,
        prevPeriodId: prev?.id ?? null
      }
    }

    // Build BFWD map from previous period close
    const bfwdByAsset = new Map<
      string,
      { costBfwd: string; depnBfwd: string }
    >()

    if (prev) {
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
        .where(eq(assetPeriodBalances.periodId, prev.id))

      for (const r of prevRows) {
        const costCfwd = computeCostCfwd(r)
        const depnCfwd = computeDepnCfwd(r)

        bfwdByAsset.set(r.assetId, {
          costBfwd: toDecStr(costCfwd),
          depnBfwd: toDecStr(depnCfwd)
        })
      }
    }

    const values = assets.map(a => {
      const bfwd = bfwdByAsset.get(a.assetId)
      return {
        assetId: a.assetId,
        periodId,

        // BFWD from previous close (or 0)
        costBfwd: bfwd?.costBfwd ?? '0',
        depreciationBfwd: bfwd?.depnBfwd ?? '0',

        // in-period movements start at 0
        additions: '0',
        disposalsCost: '0',
        costAdjustment: '0',

        depreciationCharge: '0',
        depreciationOnDisposals: '0',
        depreciationAdjustment: '0',
        disposalProceeds: '0'
      }
    })

    // Insert missing rows only
    await tx
      .insert(assetPeriodBalances)
      .values(values)
      .onConflictDoNothing({
        target: [assetPeriodBalances.assetId, assetPeriodBalances.periodId]
      })

    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/assets`
    )

    return {
      success: true as const,
      seeded: values.length,
      prevPeriodId: prev?.id ?? null
    }
  })
}

/**
 * Recalculate depreciation for a period (canonical rules):
 * - Uses calculatePeriodDepreciationFromBalances from lib/asset-calculations.ts
 * - Upserts depreciation_entries (1 row per asset per period)
 * - Updates asset_period_balances.depreciation_charge
 *
 * Pre-req: balances must exist (seed first).
 */
export async function recalculateDepreciationForPeriodAction(input: {
  clientId: string
  periodId: string
}) {
  const { clientId, periodId } = input

  const periods = await getCurrentAndPreviousPeriod({ clientId, periodId })
  if (!periods) return { success: false as const, error: 'Period not found' }

  const { current } = periods

  if (current.status !== 'OPEN') {
    return {
      success: false as const,
      error: `Period is ${current.status}. Recalc is disabled.`
    }
  }

  const periodStartDate = new Date(String(current.startDate))
  const periodEndDate = new Date(String(current.endDate))

  return await db.transaction(async tx => {
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
      return {
        success: false as const,
        error: 'No period balances found. Click "Generate schedule" first.'
      }
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

      // Audit trail: upsert single entry per asset/period
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
            rateUsed: toDecStr(depreciationRate),
            createdAt: new Date()
          }
        })

      // Schedule line: update depreciation charge
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

    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/assets`
    )

    return { success: true as const, updated }
  })
}
