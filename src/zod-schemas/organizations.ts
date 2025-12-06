import { z } from 'zod'

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

// /zod-schemas/organizations.ts

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  logo: z.string().nullable(),
  metadata: z.string().nullable()
})

export type OrganizationType = z.infer<typeof OrganizationSchema>
