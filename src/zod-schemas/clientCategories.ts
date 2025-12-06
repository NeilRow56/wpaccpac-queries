import { z } from 'zod/v4'

import { clientCategories } from '@/db/schema'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const insertClientCategorySchema = createInsertSchema(clientCategories, {
  name: schema =>
    schema
      .min(1, 'Name is required')
      .max(100, { error: 'Name must be at most 100 characters!' }),
  organizationId: schema => schema.min(1, 'OrganizationId is required')
})

export const selectClientCategorySchema = createSelectSchema(clientCategories)

export type insertClientCategorySchemaType = z.infer<
  typeof insertClientCategorySchema
>

export type selectClientCategorySchemaType = z.infer<
  typeof selectClientCategorySchema
>
