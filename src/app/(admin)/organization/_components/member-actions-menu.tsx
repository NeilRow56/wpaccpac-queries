'use client'

import { useState, useTransition } from 'react'
import {
  Archive,
  RotateCcw,
  Shield,
  User,
  Loader2,
  MoreVertical
} from 'lucide-react'
import { toast } from 'sonner'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { archiveUser, reinstateUser } from '@/server-actions/users'
import { updateMemberRole } from '@/server-actions/members'

type EditableRole = 'admin' | 'member'

interface MemberActionsMenuProps {
  userId: string
  memberId: string
  initialRole: EditableRole
  initialArchived: boolean
  refetchOrganization: () => Promise<void>
}

export function MemberActionsMenu({
  userId,
  memberId,
  initialRole,
  initialArchived,
  refetchOrganization
}: MemberActionsMenuProps) {
  const [isPending, startTransition] = useTransition()

  // 🔹 optimistic local state
  const [role, setRole] = useState<'admin' | 'member'>(initialRole)
  const [isArchived, setIsArchived] = useState(initialArchived)

  /* -----------------------------
     ROLE TOGGLE
  ----------------------------- */
  const handleToggleRole = () => {
    const nextRole = role === 'admin' ? 'member' : 'admin'

    // optimistic update
    setRole(nextRole)

    startTransition(async () => {
      try {
        await updateMemberRole(memberId, nextRole)
        toast.success(
          nextRole === 'admin'
            ? 'Member promoted to admin'
            : 'Admin demoted to member'
        )
        await refetchOrganization()
      } catch (error) {
        console.log(error)
        // rollback
        setRole(role)
        toast.error('Failed to update role')
      }
    })
  }

  /* -----------------------------
     ARCHIVE / REINSTATE
  ----------------------------- */
  const handleArchiveToggle = () => {
    const nextArchived = !isArchived

    // optimistic update
    setIsArchived(nextArchived)

    startTransition(async () => {
      try {
        if (nextArchived) {
          await archiveUser(userId)
          toast.success('User archived')
        } else {
          await reinstateUser(userId)
          toast.success('User reinstated')
        }

        await refetchOrganization()
      } catch (error) {
        console.log(error)
        // rollback
        setIsArchived(!nextArchived)
        toast.error('Action failed')
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          disabled={isPending}
          aria-label='Member actions'
        >
          {isPending ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <MoreVertical className='size-4' />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-48'>
        {/* ROLE */}
        <DropdownMenuItem onClick={handleToggleRole} disabled={isPending}>
          {role === 'admin' ? (
            <>
              <User className='mr-2 size-4' />
              Demote to member
            </>
          ) : (
            <>
              <Shield className='mr-2 size-4' />
              Promote to admin
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* ARCHIVE */}
        <DropdownMenuItem
          onClick={handleArchiveToggle}
          disabled={isPending}
          className={isArchived ? '' : 'text-red-600'}
        >
          {isArchived ? (
            <>
              <RotateCcw className='mr-2 size-4' />
              Reinstate member
            </>
          ) : (
            <>
              <Archive className='mr-2 size-4' />
              Archive member
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
