import type { auth } from '@/lib/auth'

export type AppSession =
  | (typeof auth.$Infer.Session & {
      activeOrganizationId?: string | null
    })
  | null
