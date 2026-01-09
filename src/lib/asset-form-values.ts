// lib/asset-form-values.ts
import { AssetWithCalculations } from '@/lib/asset-calculations'
import { AssetFormValues } from '@/zod-schemas/fixedAssets'
export function assetToFormValues(
  asset: AssetWithCalculations
): AssetFormValues {
  return {
    name: asset.name,
    clientId: asset.clientId,
    categoryId: asset.categoryId ?? '',
    description: asset.description ?? '',

    originalCost: asset.originalCost.toString(),
    costAdjustment: asset.costAdjustment.toString(),

    acquisitionDate: asset.acquisitionDate.toISOString().slice(0, 10),

    depreciationMethod: asset.depreciationMethod,
    depreciationRate: asset.depreciationRate.toString()
  }
}
