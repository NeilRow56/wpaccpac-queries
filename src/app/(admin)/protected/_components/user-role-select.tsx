'use client'

import { Role } from '@/db/schema'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface UserRoleSelectProps {
  userId: string
  role: Role
}

const API_ROLES: Array<'user' | 'admin'> = ['user', 'admin']

export const UserRoleSelect = ({ userId, role }: UserRoleSelectProps) => {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  // Map full role to dropdown display
  const DROPDOWN_OPTIONS: Array<{ label: string; value: Role }> = [
    { label: 'USER', value: 'user' },
    { label: 'ADMIN', value: 'admin' },
    { label: 'OWNER', value: 'owner' } // displayed but not sent to API
  ]

  async function handleChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = evt.target.value as Role

    // Only call setRole for roles supported by Better Auth API
    if (!API_ROLES.includes(newRole as 'user' | 'admin')) {
      toast.error('Cannot change to this role via UI')
      return
    }

    const canChangeRole = await authClient.admin.hasPermission({
      permissions: {
        user: ['set-role']
      }
    })

    if (canChangeRole.error) {
      return toast.error('Forbidden')
    }

    await authClient.admin.setRole({
      userId,
      role: newRole,
      fetchOptions: {
        onRequest: () => setIsPending(true),
        onResponse: () => setIsPending(false),
        onError: ctx => {
          toast.error(ctx.error.message) // just call it, don’t return
        },
        onSuccess: () => {
          toast.success('User role updated')
          router.refresh()
        }
      }
    })
  }

  return (
    <select
      value={role}
      onChange={handleChange}
      disabled={isPending}
      className='px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
    >
      {DROPDOWN_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
