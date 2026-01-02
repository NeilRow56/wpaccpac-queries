// zod-schemas/asset-form-schema.ts
import * as z from 'zod'

export const assetFormSchema = z.object({
  name: z.string().min(1),
  clientId: z.uuid(),
  categoryId: z.uuid(),
  description: z.string().optional(),
  cost: z.string(),
  costAdjustment: z.string(),
  dateOfPurchase: z.string(),
  depreciationAdjustment: z.string(),
  depreciationMethod: z.enum(['straight_line', 'reducing_balance']),
  depreciationRate: z.string(),
  totalDepreciationToDate: z.string(),
  disposalValue: z.string().optional()
})

export type AssetFormValues = z.infer<typeof assetFormSchema>
