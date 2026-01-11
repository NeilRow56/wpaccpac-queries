// lib/asset-calculations.ts

import { AssetPeriodBalances, DepreciationEntry } from '@/db/schema'
import { AssetWithCategory } from './types/fixed-assets'

/* ----------------------------------
 * Types
 * ---------------------------------- */

export type DepreciationMethod = 'straight_line' | 'reducing_balance'

export interface AssetWithCalculations {
  id: string
  name: string
  description?: string
  clientId: string

  categoryId?: string | null
  categoryName?: string | null

  originalCost: number
  costAdjustment: number // master-level (legacy-ish): treat as historic adjustments only

  acquisitionDate: Date

  depreciationRate: number
  depreciationMethod: DepreciationMethod

  adjustedCost: number
  daysSinceAcquisition: number

  // Placeholders for non-period contexts (edit forms etc)
  depreciationForPeriod: number
  netBookValue: number
}

/* ----------------------------------
 * Date helpers
 * ---------------------------------- */

export function calculateDaysSinceAcquisition(purchaseDate: Date): number {
  const today = new Date()
  const diffTime = today.getTime() - purchaseDate.getTime()
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
}

export function calculateDaysInPeriod(
  periodStart: Date,
  periodEnd: Date,
  purchaseDate: Date
): number {
  const effectiveStart = purchaseDate > periodStart ? purchaseDate : periodStart
  const diffTime = periodEnd.getTime() - effectiveStart.getTime()
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.max(0, days)
}

/* ----------------------------------
 * Depreciation calculations (PURE)
 * ---------------------------------- */

export function calculateStraightLineDepreciation(
  depreciableAmount: number,
  depreciationRate: number,
  daysInPeriod: number
): number {
  const annualDepreciation = (depreciableAmount * depreciationRate) / 100
  return (annualDepreciation / 365) * daysInPeriod
}

export function calculateReducingBalanceDepreciation(
  openingNBV: number,
  depreciationRate: number,
  daysInPeriod: number
): number {
  const rate = depreciationRate / 100
  const fractionOfYear = daysInPeriod / 365
  const closingValue = openingNBV * Math.pow(1 - rate, fractionOfYear)
  return Math.max(0, openingNBV - closingValue)
}

/* ----------------------------------
 * Period depreciation (CANONICAL)
 *
 * Rules:
 * - Straight-line uses ORIGINAL COST (not adjusted cost)
 * - Reducing balance uses OPENING NBV
 * - Cost adjustments in the current period do NOT affect the depreciation base
 *   (they appear as period movements only).
 * ---------------------------------- */

export function calculatePeriodDepreciationFromBalances(params: {
  openingCost: number
  additionsAtCost: number
  costAdjustmentForPeriod: number
  disposalsAtCost: number

  openingAccumulatedDepreciation: number

  depreciationRate: number
  method: DepreciationMethod

  periodStartDate: Date
  periodEndDate: Date
  acquisitionDate: Date
}): number {
  const {
    openingCost,
    additionsAtCost,
    costAdjustmentForPeriod,
    disposalsAtCost,
    openingAccumulatedDepreciation,
    depreciationRate,
    method,
    periodStartDate,
    periodEndDate,
    acquisitionDate
  } = params

  const daysInPeriod = calculateDaysInPeriod(
    periodStartDate,
    periodEndDate,
    acquisitionDate
  )
  if (daysInPeriod <= 0) return 0

  // Period cost rollforward base
  const closingCost =
    openingCost + additionsAtCost + costAdjustmentForPeriod - disposalsAtCost

  const openingNBV = closingCost - openingAccumulatedDepreciation
  if (openingNBV <= 0) return 0

  const dep =
    method === 'straight_line'
      ? calculateStraightLineDepreciation(
          closingCost,
          depreciationRate,
          daysInPeriod
        )
      : calculateReducingBalanceDepreciation(
          openingNBV,
          depreciationRate,
          daysInPeriod
        )

  return Math.min(dep, openingNBV)
}

export function calculatePeriodDepreciation(params: {
  originalCost: number
  openingCost: number
  openingAccumulatedDepreciation: number
  depreciationRate: number
  method: DepreciationMethod
  periodStartDate: Date
  periodEndDate: Date
  acquisitionDate: Date
}): number {
  const {
    originalCost,
    openingCost,
    openingAccumulatedDepreciation,
    depreciationRate,
    method,
    periodStartDate,
    periodEndDate,
    acquisitionDate
  } = params

  const daysInPeriod = calculateDaysInPeriod(
    periodStartDate,
    periodEndDate,
    acquisitionDate
  )

  if (daysInPeriod <= 0) return 0

  const openingNBV = Math.max(0, openingCost - openingAccumulatedDepreciation)
  if (openingNBV <= 0) return 0

  const depreciation =
    method === 'straight_line'
      ? calculateStraightLineDepreciation(
          originalCost,
          depreciationRate,
          daysInPeriod
        )
      : calculateReducingBalanceDepreciation(
          openingNBV,
          depreciationRate,
          daysInPeriod
        )

  // Never depreciate below zero NBV
  return Math.min(depreciation, openingNBV)
}

/* ----------------------------------
 * UI enrichment (master-data only)
 * Used for edit forms etc (NOT period reporting)
 * ---------------------------------- */

export function enrichAssetWithCalculations(
  asset: AssetWithCategory
): AssetWithCalculations {
  const originalCost = Number(asset.originalCost ?? 0)
  const costAdjustment = Number(asset.costAdjustment ?? 0) // treat as historic adjustments at master level

  const acquisitionDate =
    typeof asset.acquisitionDate === 'string'
      ? new Date(asset.acquisitionDate)
      : asset.acquisitionDate

  const adjustedCost = originalCost + costAdjustment

  return {
    id: asset.id,
    name: asset.name,
    description: asset.description ?? '',
    clientId: asset.clientId,

    categoryId: asset.category?.id ?? null,
    categoryName: asset.category?.name ?? null,

    originalCost,
    costAdjustment,

    depreciationRate: Number(asset.depreciationRate),
    depreciationMethod: asset.depreciationMethod,

    acquisitionDate,

    adjustedCost,
    daysSinceAcquisition: calculateDaysSinceAcquisition(acquisitionDate),

    // Neutral placeholders — true values are period-based
    depreciationForPeriod: 0,
    netBookValue: adjustedCost
  }
}

/* ----------------------------------
 * Period-based enrichment (USED BY TABLES)
 * ---------------------------------- */

export interface AssetWithPeriodCalculations extends AssetWithCategory {
  openingCost: number
  additionsAtCost: number
  disposalsAtCost: number

  costAdjustmentForPeriod: number // ✅ add
  closingCost: number

  openingAccumulatedDepreciation: number
  depreciationForPeriod: number
  depreciationEntry: DepreciationEntry | null
  depreciationOnDisposals: number
  closingAccumulatedDepreciation: number

  openingNBV: number
  closingNBV: number
}

/**
 * Notes on cost adjustments:
 * - Opening cost BFWD should include historic purchase cost + historic adjustments.
 * - Current-period adjustments should be recorded in asset_period_balances.costAdjustment
 *   and shown only in that period.
 *
 * Transitional fallback:
 * - If no balance row exists, we interpret fixed_assets.costAdjustment as "historic adjustments"
 *   and treat it as BFWD when acquisitionDate < periodStart, otherwise as a current-period adjustment
 *   if the asset is acquired in-period (rare in practice, but keeps behaviour sane).
 */
export function enrichAssetWithPeriodCalculations(
  asset: AssetWithCategory,
  context: {
    period: { startDate: Date; endDate: Date }
    depreciationByAssetId: Map<string, DepreciationEntry>
    balancesByAssetId: Map<string, AssetPeriodBalances>
  }
): AssetWithPeriodCalculations {
  const { startDate, endDate } = context.period

  const entry = context.depreciationByAssetId.get(asset.id)
  const balance = context.balancesByAssetId.get(asset.id)

  const originalCost = Number(asset.originalCost ?? 0)
  const masterCostAdjustment = Number(asset.costAdjustment ?? 0) // transitional only
  const depreciationRate = Number(asset.depreciationRate ?? 0)

  const acquisitionDate =
    typeof asset.acquisitionDate === 'string'
      ? new Date(asset.acquisitionDate)
      : asset.acquisitionDate

  /* ---------------- COST ---------------- */

  // If we have a balance row, it is the source of truth for BFWD and in-period movements.
  // If not, we derive from acquisition date + master fields.

  const openingCost = balance
    ? Number(balance.costBfwd) // should already include historic adjustments
    : acquisitionDate < startDate
      ? originalCost + masterCostAdjustment // treat master adjustment as historic BFWD
      : 0

  const additionsAtCost = balance
    ? Number(balance.additions)
    : acquisitionDate >= startDate && acquisitionDate <= endDate
      ? originalCost // additions at cost = purchase cost
      : 0

  const disposalsAtCost = balance ? Number(balance.disposalsCost) : 0
  const costAdjustmentForPeriod = balance ? Number(balance.costAdjustment) : 0
  const closingCost =
    openingCost + additionsAtCost + costAdjustmentForPeriod - disposalsAtCost

  /* ------------ DEPRECIATION ------------ */

  // BFWD depreciation:
  // - If a balance row exists, use it.
  // - Else (transitional), fall back to fixed_assets.totalDepreciationToDate for pre-period assets only.
  const openingAccumulatedDepreciation = balance
    ? Number(balance.depreciationBfwd)
    : acquisitionDate < startDate
      ? Number(asset.totalDepreciationToDate ?? 0)
      : 0

  const depreciationForPeriod = entry
    ? Number(entry.depreciationAmount)
    : calculatePeriodDepreciationFromBalances({
        openingCost,
        additionsAtCost,
        costAdjustmentForPeriod,
        disposalsAtCost,
        openingAccumulatedDepreciation,
        depreciationRate,
        method: asset.depreciationMethod,
        periodStartDate: startDate,
        periodEndDate: endDate,
        acquisitionDate
      })

  const depreciationAdjustmentForPeriod = balance
    ? Number(balance.depreciationAdjustment)
    : 0

  const actualDepreciationOnDisposals = balance
    ? Number(balance.depreciationOnDisposals)
    : 0

  // If DB hasn't recorded depreciation eliminated yet, estimate it for display:
  // estimate = available accumulated dep * (disposalsAtCost / preDisposalCost)
  //
  // preDisposalCost is the cost base before subtracting disposals.
  const preDisposalCost = Math.max(
    0,
    openingCost + additionsAtCost + costAdjustmentForPeriod
  )

  const availableAccumDep = Math.max(
    0,
    openingAccumulatedDepreciation +
      depreciationForPeriod +
      depreciationAdjustmentForPeriod
  )

  const disposalFraction =
    preDisposalCost > 0
      ? Math.max(0, Math.min(1, disposalsAtCost / preDisposalCost))
      : 0

  const estimatedDepreciationOnDisposals =
    disposalsAtCost > 0
      ? Math.round(availableAccumDep * disposalFraction * 100) / 100
      : 0

  const depreciationOnDisposals =
    actualDepreciationOnDisposals > 0
      ? actualDepreciationOnDisposals
      : estimatedDepreciationOnDisposals

  const closingAccumulatedDepreciation =
    openingAccumulatedDepreciation +
    depreciationForPeriod +
    depreciationAdjustmentForPeriod -
    depreciationOnDisposals

  /* ---------------- NBV ---------------- */

  const openingNBV = Math.max(0, openingCost - openingAccumulatedDepreciation)
  const closingNBV = Math.max(0, closingCost - closingAccumulatedDepreciation)

  return {
    ...asset,

    openingCost,
    additionsAtCost,
    costAdjustmentForPeriod,
    disposalsAtCost,
    closingCost,

    openingAccumulatedDepreciation,
    depreciationForPeriod,
    depreciationEntry: entry ?? null,
    depreciationOnDisposals,
    closingAccumulatedDepreciation,

    openingNBV,
    closingNBV
  }
}

/* ----------------------------------
 * UI-friendly type for tables
 * ---------------------------------- */

export interface AssetWithPeriodUI {
  id: string
  name: string
  clientId: string

  acquisitionDate: Date
  originalCost: number
  depreciationRate: number

  openingNBV: number
  depreciationForPeriod: number
  closingNBV: number
}
