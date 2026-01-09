// export type AssetWithCategory = {
//   id: string
//   name: string
//   description?: string
//   clientId: string
//   category?: {
//     id: string
//     name: string
//   } | null

//   acquisitionDate: Date | string
//   disposalDate: Date | string
//   originalCost: string | number
//   openingCost: string | number
//   costAdjustment: string | number
//   depreciationAdjustment: string | number
//   depreciationRate: string | number
//   depreciationMethod: 'straight_line' | 'reducing_balance'

//   totalDepreciationToDate?: string | number | null
//   disposalValue?: string | number | null
// }
import type { FixedAsset, AssetCategory } from '@/db/schema'

export type AssetWithCategory = FixedAsset & {
  category: AssetCategory | null
}
