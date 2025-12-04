import { createAuthClient } from 'better-auth/react'
import {
  adminClient,
  inferAdditionalFields,
  organizationClient
} from 'better-auth/client/plugins'
import { ac, roles } from '@/lib/permissions'
import { auth } from './auth'

export const authClient = createAuthClient({
  baseURL: '', // keep empty
  fetchOptions: {
    credentials: 'include' // required for cross-origin previews
  },
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient({ ac, roles }),
    organizationClient()
  ]
})
