// lib/asset-calculations.ts

export function calculateDaysSinceAcquisition(purchaseDate: Date): number {
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - purchaseDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function calculateDepreciationForPeriod(
  cost: number,
  adjustment: number,
  depreciationRate: number, // as percentage (e.g., 20 for 20%)
  daysSinceAcquisition: number
): number {
  // Adjusted cost = original cost + adjustment
  const adjustedCost = cost + adjustment
  // Daily depreciation = (adjusted cost × rate) / 365
  const annualDepreciation = (adjustedCost * depreciationRate) / 100
  const dailyDepreciation = annualDepreciation / 365
  return dailyDepreciation * daysSinceAcquisition
}

export function calculateNetBookValue(
  cost: number,
  adjustment: number,
  totalDepreciationToDate: number,
  depreciationForPeriod: number
): number {
  const adjustedCost = cost + adjustment
  const nbv = adjustedCost - totalDepreciationToDate - depreciationForPeriod
  // Ensure NBV doesn't go below zero
  return Math.max(0, nbv)
}

export interface AssetWithCalculations {
  id: number
  name: string
  clientId: string
  description?: string | null
  dateOfPurchase: Date
  cost: number
  adjustment: number
  depreciationRate: number
  totalDepreciationToDate: number
  disposalValue?: number | null
  daysSinceAcquisition: number
  depreciationForPeriod: number
  netBookValue: number
  adjustedCost: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    description: asset.description,
    dateOfPurchase: new Date(asset.dateOfPurchase),
    cost,
    adjustment,
    adjustedCost,
    depreciationRate: parseFloat(asset.depreciationRate),
    totalDepreciationToDate: parseFloat(asset.totalDepreciationToDate || '0'),
    disposalValue: asset.disposalValue ? parseFloat(asset.disposalValue) : null,
    daysSinceAcquisition: daysSince,
    depreciationForPeriod,
    netBookValue
  }
}
