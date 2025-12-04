import { z } from 'zod/v4'

import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { organization } from '@/db/schema'

export const insertOrganizationSchema = createInsertSchema(organization, {
  name: schema =>
    schema
      .min(1, 'Name is required')
      .max(100, { error: 'Name must be at most 100 characters!' }),
  slug: schema =>
    schema
      .min(1, 'Name is required')
      .max(100, { error: 'Name must be at most 100 characters!' })
})

export const selectOrganizationSchema = createSelectSchema(organization)

export type insertOrganizationSchemaType = z.infer<
  typeof insertOrganizationSchema
>

export type selectOrganizationSchemaType = z.infer<
  typeof selectOrganizationSchema
>
