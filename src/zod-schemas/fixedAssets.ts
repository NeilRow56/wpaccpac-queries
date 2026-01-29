// zod-schemas/fixedAssets.ts (or wherever you keep it)
import { z } from 'zod'

const moneyStringDefault0 = z
  .string()
  .transform(v => (v === '' ? '0' : v))
  .refine(v => !isNaN(Number(v)), 'Invalid amount')

const requiredMoneyString = z
  .string()
  .min(1, 'Required')
  .refine(v => !isNaN(Number(v)), 'Invalid amount')

const requiredPercentString = z
  .string()
  .min(1, 'Required')
  .refine(v => !isNaN(Number(v)), 'Must be a number')
  .refine(v => Number(v) >= 0 && Number(v) <= 100, 'Must be 0–100')

/**
 * Canonical asset master fields only (no opening balances, no disposals)
 * Forms keep strings; conversion happens in server/calculation layer.
 */
export const assetBaseSchema = z.object({
  name: z.string().min(1, 'Asset name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  // ✅ make it defaulted, not optional
  isFinanceLease: z.boolean().default(false),
  acquisitionDate: z.string().min(1, 'Acquisition date is required'), // yyyy-mm-dd
  originalCost: requiredMoneyString,
  costAdjustment: moneyStringDefault0,

  depreciationMethod: z.enum(['straight_line', 'reducing_balance']),
  depreciationRate: requiredPercentString
})

/**
 * Create/Edit Asset form schema
 * (clientId is included because your form currently includes it)
 */
export const assetFormSchema = assetBaseSchema.extend({
  clientId: z.string().min(1) // keep as string; you can enforce uuid if you want
})

export type AssetFormInput = z.input<typeof assetFormSchema>
export type AssetFormValues = z.output<typeof assetFormSchema>

/**
 * Historic asset schema (Option B)
 * Adds opening accumulated depreciation and period context for period balances.
 */
export const createHistoricAssetSchema = assetBaseSchema
  .extend({
    clientId: z.string().min(1),
    periodId: z.string().min(1),
    openingAccumulatedDepreciation: requiredMoneyString
  })
  .refine(val => Number(val.openingAccumulatedDepreciation || '0') >= 0, {
    path: ['openingAccumulatedDepreciation'],
    message: 'Opening accumulated depreciation cannot be negative.'
  })
  .refine(
    val => {
      const cost = Number(val.originalCost || '0')
      const adj = Number(val.costAdjustment || '0')
      const openingDep = Number(val.openingAccumulatedDepreciation || '0')
      return openingDep <= cost + adj
    },
    {
      path: ['openingAccumulatedDepreciation'],
      message:
        'Opening accumulated depreciation cannot exceed cost (including cost adjustment).'
    }
  )

export type CreateHistoricAssetInput = z.input<typeof createHistoricAssetSchema>
export type CreateHistoricAssetValues = z.output<
  typeof createHistoricAssetSchema
>
