import type { FixedAsset, AssetCategory } from '@/db/schema'

export type AssetWithCategory = FixedAsset & {
  category: AssetCategory | null
}
