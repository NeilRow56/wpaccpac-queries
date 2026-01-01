// zod-schemas/client-schema.ts
import { z } from 'zod'

export const clientFormSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  organizationId: z.string().min(1, 'Organisation is required'),
  costCentreId: z.string().min(1, 'Cost Centre is required'),
  entity_type: z.string().min(1, 'Entity type is required'),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional()
})

export type ClientFormValues = z.infer<typeof clientFormSchema>
