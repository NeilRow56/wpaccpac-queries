import { z } from 'zod'

export const costCentreFormSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  organizationId: z.string().min(1, 'Organisation is required')
})

export type CostCentreFormValues = z.infer<typeof costCentreFormSchema>
