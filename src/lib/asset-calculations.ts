/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/asset-calculations.ts

export type DepreciationMethod = 'straight_line' | 'reducing_balance'

export interface PeriodDepreciationParams {
  cost: number
  adjustment: number
  depreciationRate: number
  method: DepreciationMethod
  periodStartDate: Date
  periodEndDate: Date
  purchaseDate: Date
  totalDepreciationToDate: number
}

/**
 * Calculate days since acquisition
 */
export function calculateDaysSinceAcquisition(purchaseDate: Date): number {
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - purchaseDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Calculate days in period that asset was owned
 */
export function calculateDaysInPeriod(
  periodStart: Date,
  periodEnd: Date,
  purchaseDate: Date
): number {
  // Asset purchased before or during period
  const effectiveStart = purchaseDate > periodStart ? purchaseDate : periodStart

  // Calculate days from effective start to period end
  const diffTime = periodEnd.getTime() - effectiveStart.getTime()
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end

  return Math.max(0, days)
}

/**
 * Calculate straight-line depreciation for a period
 */
export function calculateStraightLineDepreciation(
  adjustedCost: number,
  depreciationRate: number,
  daysInPeriod: number
): number {
  const annualDepreciation = (adjustedCost * depreciationRate) / 100
  const dailyDepreciation = annualDepreciation / 365
  return dailyDepreciation * daysInPeriod
}

/**
 * Calculate reducing balance depreciation for a period
 */
export function calculateReducingBalanceDepreciation(
  netBookValue: number, // NBV at start of period
  depreciationRate: number,
  daysInPeriod: number
): number {
  // For reducing balance, we depreciate based on the current NBV
  // Formula: NBV × (1 - rate)^(days/365)
  // Depreciation = NBV - (NBV × (1 - rate)^(days/365))

  const rate = depreciationRate / 100
  const periodFraction = daysInPeriod / 365
  const endingValue = netBookValue * Math.pow(1 - rate, periodFraction)
  const depreciation = netBookValue - endingValue

  return depreciation
}

/**
 * Calculate depreciation for period (legacy - uses straight line from purchase to today)
 */
export function calculateDepreciationForPeriod(
  cost: number,
  adjustment: number,
  depreciationRate: number,
  daysSinceAcquisition: number
): number {
  const adjustedCost = cost + adjustment
  const annualDepreciation = (adjustedCost * depreciationRate) / 100
  const dailyDepreciation = annualDepreciation / 365
  return dailyDepreciation * daysSinceAcquisition
}

/**
 * Main function to calculate depreciation for a specific accounting period
 */
export function calculatePeriodDepreciation(
  params: PeriodDepreciationParams
): number {
  const adjustedCost = params.cost + params.adjustment
  const daysInPeriod = calculateDaysInPeriod(
    params.periodStartDate,
    params.periodEndDate,
    params.purchaseDate
  )

  // Asset not owned during this period
  if (daysInPeriod <= 0) {
    return 0
  }

  if (params.method === 'straight_line') {
    return calculateStraightLineDepreciation(
      adjustedCost,
      params.depreciationRate,
      daysInPeriod
    )
  } else {
    // For reducing balance, calculate NBV at start of period
    const netBookValue = adjustedCost - params.totalDepreciationToDate

    // Don't depreciate below zero
    if (netBookValue <= 0) {
      return 0
    }

    const depreciation = calculateReducingBalanceDepreciation(
      netBookValue,
      params.depreciationRate,
      daysInPeriod
    )

    // Ensure we don't depreciate below zero
    return Math.min(depreciation, netBookValue)
  }
}

export function calculateNetBookValue(
  cost: number,
  adjustment: number,
  totalDepreciationToDate: number,
  depreciationForPeriod: number
): number {
  const adjustedCost = cost + adjustment
  const nbv = adjustedCost - totalDepreciationToDate - depreciationForPeriod
  return Math.max(0, nbv)
}

export interface AssetWithCalculations {
  id: string
  name: string
  clientId: string
  categoryId?: string | null
  categoryName?: string | null
  description?: string | null
  dateOfPurchase: Date
  cost: number
  adjustment: number
  depreciationRate: number
  depreciationMethod: DepreciationMethod
  totalDepreciationToDate: number
  disposalValue?: number | null
  daysSinceAcquisition: number
  depreciationForPeriod: number
  netBookValue: number
  adjustedCost: number
}

export function enrichAssetWithCalculations(asset: any): AssetWithCalculations {
  const daysSince = calculateDaysSinceAcquisition(
    new Date(asset.dateOfPurchase)
  )
  const cost = parseFloat(asset.cost)
  const adjustment = parseFloat(asset.adjustment || '0')
  const adjustedCost = cost + adjustment

  const depreciationForPeriod = calculateDepreciationForPeriod(
    cost,
    adjustment,
    parseFloat(asset.depreciationRate),
    daysSince
  )

  const netBookValue = calculateNetBookValue(
    cost,
    adjustment,
    parseFloat(asset.totalDepreciationToDate || '0'),
    depreciationForPeriod
  )

  return {
    id: asset.id,
    name: asset.name,
    clientId: asset.clientId,
    categoryId: asset.categoryId,
    categoryName: asset.category?.name || null,
    description: asset.description,
    dateOfPurchase: new Date(asset.dateOfPurchase),
    cost,
    adjustment,
    adjustedCost,
    depreciationRate: parseFloat(asset.depreciationRate),
    depreciationMethod: asset.depreciationMethod as DepreciationMethod,
    totalDepreciationToDate: parseFloat(asset.totalDepreciationToDate || '0'),
    disposalValue: asset.disposalValue ? parseFloat(asset.disposalValue) : null,
    daysSinceAcquisition: daysSince,
    depreciationForPeriod,
    netBookValue
  }
}

/**
 * Enhanced interface with period-specific calculations
 */
export interface AssetWithPeriodCalculations extends AssetWithCalculations {
  periodDepreciation: number
  daysInPeriod: number
}

/**
 * Enrich asset with period-specific calculations
 */
export function enrichAssetWithPeriodCalculations(
  asset: any,
  currentPeriod: { startDate: Date; endDate: Date }
): AssetWithPeriodCalculations {
  const baseCalculations = enrichAssetWithCalculations(asset)

  const periodDepreciation = calculatePeriodDepreciation({
    cost: baseCalculations.cost,
    adjustment: baseCalculations.adjustment,
    depreciationRate: baseCalculations.depreciationRate,
    method: asset.depreciationMethod as DepreciationMethod,
    periodStartDate: currentPeriod.startDate,
    periodEndDate: currentPeriod.endDate,
    purchaseDate: baseCalculations.dateOfPurchase,
    totalDepreciationToDate: baseCalculations.totalDepreciationToDate
  })

  const daysInPeriod = calculateDaysInPeriod(
    currentPeriod.startDate,
    currentPeriod.endDate,
    baseCalculations.dateOfPurchase
  )

  return {
    ...baseCalculations,
    periodDepreciation,
    daysInPeriod
  }
}
