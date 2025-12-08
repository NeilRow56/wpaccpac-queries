import { z } from 'zod/v4'

import { businessTypes, clients } from '@/db/schema'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const insertClientSchema = createInsertSchema(clients, {
  name: schema =>
    schema
      .min(1, 'Name is required')
      .max(100, { error: 'Name must be at most 100 characters!' }),
  organizationId: schema => schema.min(1, 'OrganizationId is required'),
  cost_centre_name: schema => schema.min(1, 'Cost center Id is required'),
  entity_type: z.enum(businessTypes),

  active: z.boolean()
})

export const selectClientSchema = createSelectSchema(clients)

export type insertClientSchemaType = z.infer<typeof insertClientSchema>

export type selectClientSchemaType = z.infer<typeof selectClientSchema>
