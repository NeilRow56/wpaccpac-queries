import { z } from 'zod/v4'

import { costCentres } from '@/db/schema'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const insertCostCentreSchema = createInsertSchema(costCentres, {
  name: schema =>
    schema
      .min(1, 'Name is required')
      .max(100, { error: 'Name must be at most 100 characters!' })
  // organizationId: schema => schema.min(1, 'OrganizationId is required')
})

export const selectCostCentreSchema = createSelectSchema(costCentres)

export type insertCostCentreSchemaType = z.infer<typeof insertCostCentreSchema>

export type selectCostCentreSchemaType = z.infer<typeof selectCostCentreSchema>
