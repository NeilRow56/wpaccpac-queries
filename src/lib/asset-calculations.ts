// lib/asset-calculations.ts

import { DepreciationEntry } from '@/db/schema'
import { AssetWithCategory } from './types/fixed-assets'

/* ----------------------------------
 * Types
 * ---------------------------------- */

export type DepreciationMethod = 'straight_line' | 'reducing_balance'

export interface PeriodDepreciationParams {
  cost: number
  costAdjustment: number
  depreciationAdjustment: number
  depreciationRate: number
  method: DepreciationMethod
  periodStartDate: Date
  periodEndDate: Date
  purchaseDate: Date
  totalDepreciationToDate: number
}

export interface AssetWithCalculations {
  id: string
  name: string
  description?: string
  clientId: string

  categoryId?: string | null
  categoryName?: string | null

  originalCost: number
  costAdjustment: number
  depreciationAdjustment: number

  acquisitionDate: Date

  depreciationRate: number
  depreciationMethod: DepreciationMethod
  totalDepreciationToDate: number
  disposalValue?: number | null

  adjustedCost: number
  daysSinceAcquisition: number
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
 * ---------------------------------- */

export function calculatePeriodDepreciation(params: {
  originalCost: number
  costAdjustment: number
  depreciationAdjustment: number
  depreciationRate: number
  method: DepreciationMethod
  periodStartDate: Date
  periodEndDate: Date
  acquisitionDate: Date
  totalDepreciationToDate: number
}): number {
  const {
    originalCost,
    costAdjustment,
    depreciationAdjustment,
    depreciationRate,
    method,
    periodStartDate,
    periodEndDate,
    acquisitionDate,
    totalDepreciationToDate
  } = params

  const daysInPeriod = calculateDaysInPeriod(
    periodStartDate,
    periodEndDate,
    acquisitionDate
  )

  if (daysInPeriod <= 0) return 0

  const adjustedCost = originalCost + costAdjustment
  const openingNBV =
    adjustedCost - (totalDepreciationToDate + depreciationAdjustment)

  if (openingNBV <= 0) return 0

  const depreciation =
    method === 'straight_line'
      ? calculateStraightLineDepreciation(
          adjustedCost,
          depreciationRate,
          daysInPeriod
        )
      : calculateReducingBalanceDepreciation(
          openingNBV,
          depreciationRate,
          daysInPeriod
        )

  return Math.min(depreciation, openingNBV)
}

/* ----------------------------------
 * Net Book Value
 * ---------------------------------- */

export function calculateNetBookValue(
  cost: number,
  costAdjustment: number,
  totalDepreciationToDate: number,
  depreciationAdjustment: number,
  depreciationForPeriod: number
): number {
  const adjustedCost = cost + costAdjustment
  const accumulatedDepreciation =
    totalDepreciationToDate + depreciationAdjustment + depreciationForPeriod
  return Math.max(0, adjustedCost - accumulatedDepreciation)
}

export function enrichAssetWithCalculations(
  asset: AssetWithCategory
): AssetWithCalculations {
  const originalCost = Number(asset.originalCost ?? 0)
  const costAdjustment = Number(asset.costAdjustment ?? 0)
  const depreciationAdjustment = 0
  const totalDepreciationToDate = Number(asset.totalDepreciationToDate ?? 0)

  const acquisitionDate =
    typeof asset.acquisitionDate === 'string'
      ? new Date(asset.acquisitionDate)
      : asset.acquisitionDate

  const adjustedCost = originalCost + costAdjustment

  const netBookValue = Math.max(
    0,
    adjustedCost - (totalDepreciationToDate + depreciationAdjustment)
  )

  return {
    // 🔒 Preserve DB fields
    id: asset.id,
    name: asset.name,
    description: asset.description ?? '',
    clientId: asset.clientId,

    categoryId: asset.category?.id ?? null,
    categoryName: asset.category?.name ?? null,

    originalCost,
    costAdjustment,
    depreciationAdjustment,
    depreciationRate: Number(asset.depreciationRate),
    depreciationMethod: asset.depreciationMethod,
    totalDepreciationToDate,

    acquisitionDate,

    // ✅ Derived fields
    adjustedCost,
    daysSinceAcquisition: calculateDaysSinceAcquisition(acquisitionDate),
    depreciationForPeriod: 0,
    netBookValue
  }
}

/* ----------------------------------
 * Period-based enrichment (USED BY TABLES)
 * ---------------------------------- */

export interface AssetWithPeriodCalculations extends AssetWithCategory {
  openingCost: number
  additionsAtCost: number
  disposalsAtCost: number
  closingCost: number

  openingAccumulatedDepreciation: number
  depreciationForPeriod: number
  depreciationEntry: DepreciationEntry | null
  depreciationOnDisposals: number
  closingAccumulatedDepreciation: number

  openingNBV: number
  closingNBV: number
}

export function enrichAssetWithPeriodCalculations(
  asset: AssetWithCategory,
  context: {
    period: { startDate: Date; endDate: Date }
    depreciationByAssetId: Map<string, DepreciationEntry>
  }
): AssetWithPeriodCalculations {
  const { startDate, endDate } = context.period
  const entry = context.depreciationByAssetId.get(asset.id)

  // 🔒 Normalise ONCE
  const originalCost = Number(asset.originalCost)
  const costAdjustment = Number(asset.costAdjustment ?? 0)
  const depreciationAdjustment = 0
  const totalDepreciationToDate = Number(asset.totalDepreciationToDate ?? 0)
  const depreciationRate = Number(asset.depreciationRate)

  const acquisitionDate =
    typeof asset.acquisitionDate === 'string'
      ? new Date(asset.acquisitionDate)
      : asset.acquisitionDate

  /* ---------------- COST ---------------- */

  const adjustedCost = originalCost + costAdjustment

  const openingCost = acquisitionDate < startDate ? adjustedCost : 0

  const additionsAtCost =
    acquisitionDate >= startDate && acquisitionDate <= endDate
      ? adjustedCost
      : 0

  const disposalsAtCost = 0 // (no disposalDate yet)

  const closingCost = openingCost + additionsAtCost - disposalsAtCost

  /* ------------ DEPRECIATION ------------ */

  const openingAccumulatedDepreciation =
    acquisitionDate < startDate
      ? totalDepreciationToDate + depreciationAdjustment
      : 0

  const depreciationForPeriod = entry
    ? Number(entry.depreciationAmount)
    : calculatePeriodDepreciation({
        originalCost,
        costAdjustment,
        depreciationAdjustment,
        depreciationRate,
        method: asset.depreciationMethod,
        periodStartDate: startDate,
        periodEndDate: endDate,
        acquisitionDate,
        totalDepreciationToDate
      })

  const depreciationOnDisposals = 0

  const closingAccumulatedDepreciation =
    openingAccumulatedDepreciation +
    depreciationForPeriod -
    depreciationOnDisposals

  /* ---------------- NBV ---------------- */

  const openingNBV = Math.max(0, openingCost - openingAccumulatedDepreciation)

  const closingNBV = Math.max(0, closingCost - closingAccumulatedDepreciation)

  return {
    ...asset,

    openingCost,
    additionsAtCost,
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
