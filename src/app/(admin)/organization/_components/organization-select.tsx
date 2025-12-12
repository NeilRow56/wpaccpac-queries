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

/**
 * OrganizationSelect component allows the user to switch their active organization.
 * - Updates session via authClient
 * - Persists the last selected organization in the database via server action
 */
export function OrganizationSelect() {
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const { data: organizations } = authClient.useListOrganizations()

  if (!organizations || organizations.length === 0) return null

  async function setActiveOrganization(organizationId: string) {
    try {
      // 1️⃣ Update session
      await authClient.organization.setActive({ organizationId })

      // 2️⃣ Persist selection in database
      const res = await fetch('/api/switch-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      })

      if (!res.ok) {
        throw new Error('Failed to save selected organization')
      }
    } catch (err: unknown) {
      // Proper TypeScript-safe error handling
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error('Failed to switch organization')
      }
    }
  }

  return (
    <Select
      value={activeOrganization?.id ?? ''}
      onValueChange={setActiveOrganization}
    >
      <SelectTrigger className='w-full border border-red-600'>
        <SelectValue placeholder='Select an organization' />
      </SelectTrigger>
      <SelectContent>
        {organizations.map(org => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
