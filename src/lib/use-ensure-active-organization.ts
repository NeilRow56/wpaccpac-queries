// lib/use-ensure-active-organization.ts
'use client'

import { useEffect } from 'react'
import { authClient } from '@/lib/auth-client'

export function useEnsureActiveOrganization() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()

  useEffect(() => {
    if (!session || activeOrg) return

    const lastOrgId = session.session?.activeOrganizationId
    if (!lastOrgId) return

    authClient.organization.setActive({ organizationId: lastOrgId })
  }, [session, activeOrg])
}
