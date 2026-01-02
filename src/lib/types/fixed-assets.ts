import { FixedAsset } from '@/db/schema'
import { DepreciationEntry } from '@/db/schema'

export interface AssetWithPeriodCalculations extends FixedAsset {
  category?: {
    id: string
    name: string
  } | null

  openingNBV: number
  depreciationForPeriod: number
  closingNBV: number

  depreciationEntry?: DepreciationEntry | null
}
