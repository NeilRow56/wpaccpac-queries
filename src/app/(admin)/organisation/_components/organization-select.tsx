'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { useEffect } from 'react'

export function OrganizationSelect() {
  const { data: session } = authClient.useSession()

  const { data: activeOrganization, refetch: refetchActive } =
    authClient.useActiveOrganization()

  const { data: organizations, refetch: refetchOrganizations } =
    authClient.useListOrganizations()

  /**
   * 🔑 CRITICAL: when user changes, refetch org data
   */
  useEffect(() => {
    if (!session?.user?.id) return

    refetchOrganizations()
    refetchActive()
  }, [session?.user?.id, refetchOrganizations, refetchActive])

  if (!organizations || organizations.length === 0) return null

  async function setActiveOrganization(organizationId: string) {
    try {
      await authClient.organization.setActive({ organizationId })

      const res = await fetch('/api/switch-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      })

      if (!res.ok) {
        throw new Error('Failed to save selected organization')
      }

      await refetchActive()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to switch organization'
      )
    }
  }

  return (
    <div>
      <h3 className='text-primary text-xl'>Active organisation</h3>

      <Select
        value={activeOrganization?.id ?? ''}
        onValueChange={setActiveOrganization}
      >
        <SelectTrigger className='mt-2 w-full min-w-[300px] border-red-600'>
          <SelectValue placeholder='Select an organisation' />
        </SelectTrigger>

        <SelectContent>
          {organizations.map(org => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
