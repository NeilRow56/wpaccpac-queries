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

  // Map DB roles to BetterAuth roles
  const roleMap: Record<Role, 'user' | 'admin'> = {
    user: 'user',
    admin: 'admin',
    owner: 'admin', // map owner -> admin
    superuser: 'admin' // map superuser -> admin
  }

  async function handleChange(evt: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = evt.target.value as Role

    try {
      const permissionCheck = await authClient.admin.hasPermission({
        permissions: { user: ['set-role'] }
      })

      if (permissionCheck.error) {
        toast.error('Forbidden: You do not have permission to change roles')
        return
      }

      await authClient.admin.setRole({
        userId,
        role: roleMap[newRole], // TS-safe mapping
        fetchOptions: {
          onRequest: () => setIsPending(true),
          onResponse: () => setIsPending(false),
          onError: ctx => {
            toast.error(ctx.error?.message ?? 'Failed to update role')
          },
          onSuccess: () => {
            toast.success('User role updated')
            router.refresh()
          }
        }
      })
    } catch (err) {
      console.error(err)
      toast.error('Unexpected error while updating role')
      setIsPending(false)
    }
  }

  return (
    <select
      value={role}
      onChange={handleChange}
      disabled={isPending}
      className='px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50'
    >
      <option value='user'>USER</option>
      <option value='admin'>ADMIN</option>
      <option value='owner'>OWNER</option>
      <option value='superuser'>SUPERUSER</option>
    </select>
  )
}
