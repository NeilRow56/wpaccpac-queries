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

export function calculatePeriodDepreciation(
  params: PeriodDepreciationParams
): number {
  const {
    cost,
    costAdjustment,
    depreciationAdjustment,
    depreciationRate,
    method,
    periodStartDate,
    periodEndDate,
    purchaseDate,
    totalDepreciationToDate
  } = params

  const daysInPeriod = calculateDaysInPeriod(
    periodStartDate,
    periodEndDate,
    purchaseDate
  )

  if (daysInPeriod <= 0) return 0

  const adjustedCost = cost + costAdjustment
  const accumulatedDepreciation =
    totalDepreciationToDate + depreciationAdjustment

  const openingNBV = Math.max(0, adjustedCost - accumulatedDepreciation)

  if (openingNBV <= 0) return 0

  let depreciation: number

  if (method === 'straight_line') {
    depreciation = calculateStraightLineDepreciation(
      adjustedCost,
      depreciationRate,
      daysInPeriod
    )
  } else {
    depreciation = calculateReducingBalanceDepreciation(
      openingNBV,
      depreciationRate,
      daysInPeriod
    )
  }

  return Math.min(depreciation, openingNBV)
}

/* ----------------------------------
 * NBV
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

/* ----------------------------------
 * Enriched asset (NON-PERIOD)
 * ---------------------------------- */

export interface AssetWithCalculations {
  id: string
  name: string
  clientId: string
  categoryId?: string | null
  categoryName?: string | null
  description?: string | null

  dateOfPurchase: Date
  cost: number
  costAdjustment: number
  depreciationAdjustment: number

  depreciationRate: number
  depreciationMethod: DepreciationMethod

  totalDepreciationToDate: number
  disposalValue?: number | null

  daysSinceAcquisition: number
  adjustedCost: number
  depreciationForPeriod: number // ✅ ADD THIS
  netBookValue: number
}

export function enrichAssetWithCalculations(
  asset: AssetWithCategory
): AssetWithCalculations {
  const cost = Number(asset.cost)
  const costAdjustment = Number(asset.costAdjustment ?? 0)
  const depreciationAdjustment = Number(asset.depreciationAdjustment ?? 0)
  const totalDepreciationToDate = Number(asset.totalDepreciationToDate ?? 0)

  const adjustedCost = cost + costAdjustment

  const netBookValue = calculateNetBookValue(
    cost,
    costAdjustment,
    totalDepreciationToDate,
    depreciationAdjustment,
    0
  )

  return {
    id: asset.id,
    name: asset.name,
    clientId: asset.clientId,

    categoryId: asset.category?.id ?? null,
    categoryName: asset.category?.name ?? null,
    description: null,

    dateOfPurchase: new Date(asset.dateOfPurchase),

    cost,
    costAdjustment,
    depreciationAdjustment,

    depreciationRate: Number(asset.depreciationRate),
    depreciationMethod: asset.depreciationMethod,

    totalDepreciationToDate,
    disposalValue: asset.disposalValue ? Number(asset.disposalValue) : null,

    daysSinceAcquisition: calculateDaysSinceAcquisition(
      new Date(asset.dateOfPurchase)
    ),

    depreciationForPeriod: 0,
    adjustedCost,
    netBookValue
  }
}

/* ----------------------------------
 * Period-based enrichment (USED BY TABLES)
 * ---------------------------------- */

export interface AssetWithPeriodCalculations extends AssetWithCategory {
  openingNBV: number
  depreciationForPeriod: number
  closingNBV: number
  depreciationEntry: DepreciationEntry | null
}

export function enrichAssetWithPeriodCalculations(
  asset: AssetWithCategory,
  context: {
    period: {
      startDate: Date
      endDate: Date
    }
    depreciationByAssetId: Map<string, DepreciationEntry>
  }
): AssetWithPeriodCalculations {
  const entry = context.depreciationByAssetId.get(asset.id)
  const { startDate, endDate } = context.period

  const cost = Number(asset.cost)
  const costAdjustment = Number(asset.costAdjustment || 0)
  const depreciationAdjustment = Number(asset.depreciationAdjustment || 0)
  const totalDepreciationToDate = Number(asset.totalDepreciationToDate || 0)

  const adjustedCost = cost + costAdjustment

  const openingNBV = entry
    ? Number(entry.openingBalance)
    : Math.max(
        0,
        adjustedCost - (totalDepreciationToDate + depreciationAdjustment)
      )

  const depreciationForPeriod = entry
    ? Number(entry.depreciationAmount)
    : calculatePeriodDepreciation({
        cost,
        costAdjustment,
        depreciationAdjustment,
        depreciationRate: Number(asset.depreciationRate),
        method: asset.depreciationMethod as DepreciationMethod,
        periodStartDate: startDate,
        periodEndDate: endDate,
        purchaseDate: new Date(asset.dateOfPurchase),
        totalDepreciationToDate
      })

  const closingNBV = Math.max(0, openingNBV - depreciationForPeriod)

  return {
    ...asset,
    openingNBV,
    depreciationForPeriod,
    closingNBV,
    depreciationEntry: entry ?? null
  }
}

export interface AssetWithPeriodUI {
  id: string
  name: string
  clientId: string

  dateOfPurchase: Date
  cost: number
  depreciationRate: number

  openingNBV: number
  depreciationForPeriod: number
  closingNBV: number
}
