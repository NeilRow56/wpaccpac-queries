import { z, ZodString } from 'zod/v4'

import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { clients } from '@/db/schema'

export const insertClientSchema = createInsertSchema(clients, {
  id: schema => schema.optional(),
  name: schema =>
    schema
      .min(1, 'Name is required')
      .max(100, { error: 'Name must be at most 100 characters!' }),
  organizationId: schema => schema.min(1, 'OrganizationId is required'),
  costCentreId: schema => schema.min(1, 'Cost center is required'),
  entity_type: schema => schema.min(1, 'Entity type is required'),
  notes: (schema: ZodString) => schema.nullable().optional(),
  active: z.boolean()
})

export const selectClientSchema = createSelectSchema(clients)

export type insertClientSchemaType = z.infer<typeof insertClientSchema>

export type selectClientSchemaType = z.infer<typeof selectClientSchema>
