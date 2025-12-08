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

export const UserRoleSelect = ({ userId, role }: UserRoleSelectProps) => {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = evt.target.value as Role

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
        onRequest: () => {
          setIsPending(true)
        },
        onResponse: () => {
          setIsPending(false)
        },
        onError: ctx => {
          toast.error(ctx.error.message)
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
      // disabled={role === 'user' || isPending}
      disabled={isPending}
      className='px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
    >
      <option value='admin'>ADMIN</option>
      <option value='owner'>OWNER</option>
      <option value='user'>USER</option>
    </select>
  )
}
