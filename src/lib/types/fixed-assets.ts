import type { FixedAsset, AssetCategory } from '@/db/schema'

export type AssetWithCategory = FixedAsset & {
  category: AssetCategory | null
}

// src/domain/fixed-assets/depreciation.ts
export type DepreciationMethod = 'straight_line' | 'reducing_balance'
