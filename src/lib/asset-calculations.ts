/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/asset-calculations.ts

import { DepreciationEntry, FixedAsset } from '@/db/schema'

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
 * Depreciation calculations
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
 * Period depreciation
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

  let depreciation = 0

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
 * Enriched asset types
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
  depreciationForPeriod: number
  netBookValue: number
}

/* ----------------------------------
 * Asset enrichment (non-period)
 * ---------------------------------- */

export function enrichAssetWithCalculations(asset: any): AssetWithCalculations {
  const cost = Number(asset.cost)
  const costAdjustment = Number(asset.adjustment || 0)
  const depreciationAdjustment = Number(asset.depreciationAdjustment || 0)

  const adjustedCost = cost + costAdjustment
  const totalDepreciationToDate = Number(asset.totalDepreciationToDate || 0)

  const daysSinceAcquisition = calculateDaysSinceAcquisition(
    new Date(asset.dateOfPurchase)
  )

  const openingNBV = Math.max(
    0,
    adjustedCost - (totalDepreciationToDate + depreciationAdjustment)
  )

  let depreciationForPeriod = 0

  if (openingNBV > 0) {
    if (asset.depreciationMethod === 'straight_line') {
      depreciationForPeriod = calculateStraightLineDepreciation(
        adjustedCost,
        Number(asset.depreciationRate),
        daysSinceAcquisition
      )
    } else {
      depreciationForPeriod = calculateReducingBalanceDepreciation(
        openingNBV,
        Number(asset.depreciationRate),
        daysSinceAcquisition
      )
    }
  }

  depreciationForPeriod = Math.min(depreciationForPeriod, openingNBV)

  const netBookValue = calculateNetBookValue(
    cost,
    costAdjustment,
    totalDepreciationToDate,
    depreciationAdjustment,
    depreciationForPeriod
  )

  return {
    id: asset.id,
    name: asset.name,
    clientId: asset.clientId,
    categoryId: asset.categoryId,
    categoryName: asset.category?.name ?? null,
    description: asset.description ?? null,

    dateOfPurchase: new Date(asset.dateOfPurchase),
    cost,
    costAdjustment,
    depreciationAdjustment,

    depreciationRate: Number(asset.depreciationRate),
    depreciationMethod: asset.depreciationMethod as DepreciationMethod,

    totalDepreciationToDate,
    disposalValue: asset.disposalValue ? Number(asset.disposalValue) : null,

    daysSinceAcquisition,
    adjustedCost,
    depreciationForPeriod,
    netBookValue
  }
}

/* ----------------------------------
 * Period-based enrichment
 * ---------------------------------- */

export interface AssetWithPeriodCalculations extends FixedAsset {
  openingNBV: number
  depreciationForPeriod: number
  closingNBV: number
  depreciationEntry: DepreciationEntry | null
}

export function enrichAssetWithPeriodCalculations(
  asset: FixedAsset & { category?: any },
  context: {
    startDate: Date
    endDate: Date
    depreciationEntry?: DepreciationEntry | null
  }
): AssetWithPeriodCalculations {
  const entry = context.depreciationEntry ?? null

  const adjustedCost = Number(asset.cost) + Number(asset.costAdjustment || 0)

  const accumulatedDepreciation =
    Number(asset.totalDepreciationToDate || 0) +
    Number(asset.depreciationAdjustment || 0)

  const openingNBV = entry
    ? Number(entry.openingBalance)
    : Math.max(0, adjustedCost - accumulatedDepreciation)

  const depreciationForPeriod = entry ? Number(entry.depreciationAmount) : 0

  const closingNBV = Math.max(0, openingNBV - depreciationForPeriod)

  return {
    ...asset,
    openingNBV,
    depreciationForPeriod,
    closingNBV,
    depreciationEntry: entry
  }
}
