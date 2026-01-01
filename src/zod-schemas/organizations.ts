import { z } from 'zod'

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
