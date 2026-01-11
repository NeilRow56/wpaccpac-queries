import * as z from 'zod'

export const postAssetMovementSchema = z
  .object({
    clientId: z.string().uuid(),
    assetId: z.string().uuid(),
    periodId: z.string().uuid(),

    movementType: z.enum([
      'cost_adj',
      'depreciation_adj',
      'revaluation',
      'disposal_full',
      'disposal_partial'
    ]),

    postingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    amountCost: z.string(),
    amountDepreciation: z.string().optional(),
    amountProceeds: z.string().optional(),
    disposalPercentage: z.string().optional(),
    note: z.string().nullable().optional()
  })
  .superRefine((d, ctx) => {
    if (d.movementType === 'disposal_partial') {
      const pct = Number(d.disposalPercentage ?? '')
      if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['disposalPercentage'],
          message: 'For partial disposals, enter a percentage between 0 and 100'
        })
      }
    }
  })

export type PostAssetMovementInput = z.infer<typeof postAssetMovementSchema>
