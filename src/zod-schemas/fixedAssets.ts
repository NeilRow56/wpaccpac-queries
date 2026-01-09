// // zod-schemas/asset-form-schema.ts
import { z } from 'zod'

export const assetFormSchema = z.object({
  name: z.string().min(1),
  clientId: z.uuid(),
  categoryId: z.string().optional(),
  description: z.string().optional(),

  // Cost-side
  originalCost: z.string().refine(v => !isNaN(Number(v)), 'Invalid amount'),
  costAdjustment: z
    .string()
    .optional()
    .refine(v => !isNaN(Number(v)), 'Invalid amount'),
  acquisitionDate: z.string().min(1), // yyyy-mm-dd

  // Depreciation-side

  depreciationAdjustment: z
    .string()
    .optional()
    .refine(v => !isNaN(Number(v)), 'Invalid amount'),
  depreciationMethod: z.enum(['straight_line', 'reducing_balance']),
  depreciationRate: z
    .string()
    .min(1)
    .refine(v => !isNaN(Number(v)), 'Must be a number')
    .refine(v => Number(v) >= 0 && Number(v) <= 100, 'Must be 0–100'),

  totalDepreciationToDate: z
    .string()
    .optional()
    .refine(v => !isNaN(Number(v)), 'Must be a number')
    .refine(v => Number(v) >= 0 && Number(v) <= 100, 'Must be 0–100'),

  // Disposal (optional)
  disposalValue: z
    .string()
    .optional()
    .refine(v => !isNaN(Number(v)), 'Invalid amount'),
  disposalDate: z.string().optional()
})

export type AssetFormValues = z.infer<typeof assetFormSchema>

// zod-schemas/historicAsset.ts

export const historicAssetFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),

  acquisitionDate: z.string().min(1), // ISO date string from input
  originalCost: z.string().regex(/^\d+(\.\d{1,2})?$/),
  costAdjustment: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),

  depreciationMethod: z.enum(['straight_line', 'reducing_balance']),
  depreciationRate: z.string().regex(/^\d+(\.\d{1,2})?$/),

  // The extra field:
  openingAccumulatedDepreciation: z.string().regex(/^\d+(\.\d{1,2})?$/)
})
export type HistoricAssetFormValues = z.infer<typeof historicAssetFormSchema>

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount')
const isoDate = z.string().min(1, 'Date is required')

export const createHistoricAssetSchema = z.object({
  clientId: z.string().min(1),
  periodId: z.string().min(1),

  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),

  acquisitionDate: isoDate,
  originalCost: money,
  costAdjustment: money.optional(),

  depreciationMethod: z.enum(['straight_line', 'reducing_balance']),
  depreciationRate: money,

  openingAccumulatedDepreciation: money
})

export type CreateHistoricAssetInput = z.infer<typeof createHistoricAssetSchema>
