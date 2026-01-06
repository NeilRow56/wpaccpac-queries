// // zod-schemas/asset-form-schema.ts
import { z } from 'zod'

export const assetFormSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().uuid(),
  categoryId: z.string().optional(),

  description: z.string().optional(),

  cost: z.string().min(1),
  costAdjustment: z.string().optional(),
  depreciationAdjustment: z.string().optional(),

  dateOfPurchase: z.string().min(1), // yyyy-mm-dd

  depreciationMethod: z.enum(['straight_line', 'reducing_balance']),
  depreciationRate: z.string().min(1),

  totalDepreciationToDate: z.string().optional(),
  disposalValue: z.string().optional()
})

export type AssetFormValues = z.infer<typeof assetFormSchema>
