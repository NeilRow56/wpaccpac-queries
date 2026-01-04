export type AssetWithCategory = {
  id: string
  name: string
  clientId: string
  category?: {
    id: string
    name: string
  } | null

  dateOfPurchase: Date | string
  cost: string | number
  costAdjustment: string | number
  depreciationAdjustment: string | number
  depreciationRate: string | number
  depreciationMethod: 'straight_line' | 'reducing_balance'

  totalDepreciationToDate?: string | number | null
  disposalValue?: string | number | null
}
