import { z } from 'zod/v4'

import { categories } from '@/db/schema'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

export const insertCategorySchema = createInsertSchema(categories, {
  name: schema =>
    schema
      .min(1, 'Name is required')
      .max(100, { error: 'Name must be at most 100 characters!' }),
  userId: schema => schema.min(1, 'UserId is required')
})

export const selectCategorySchema = createSelectSchema(categories)

export type insertCategorySchemaType = z.infer<typeof insertCategorySchema>

export type selectCategorySchemaType = z.infer<typeof selectCategorySchema>
