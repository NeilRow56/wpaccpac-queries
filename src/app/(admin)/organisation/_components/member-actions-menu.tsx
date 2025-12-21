'use client'

import { useState, useTransition } from 'react'
import {
  Archive,
  RotateCcw,
  Shield,
  User,
  Crown,
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

/* ---------------------------------------
   Types
--------------------------------------- */

export type MemberRole = 'member' | 'admin' | 'owner'

interface MemberActionsMenuProps {
  userId: string
  memberId: string
  initialRole: MemberRole
  initialArchived: boolean

  /** number of owners in the org */
  ownerCount: number

  /** callback to update archived state in parent */
  onArchivedChange: (archived: boolean) => void

  /** refetch active organization */
  refetchOrganization: () => Promise<void>
}

/* ---------------------------------------
   Component
--------------------------------------- */

export function MemberActionsMenu({
  userId,
  memberId,
  initialRole,
  initialArchived,
  ownerCount,
  onArchivedChange,
  refetchOrganization
}: MemberActionsMenuProps) {
  const [isPending, startTransition] = useTransition()

  // optimistic local state
  const [role, setRole] = useState<MemberRole>(initialRole)
  const [isArchived, setIsArchived] = useState(initialArchived)

  const isOwner = role === 'owner'
  const isLastOwner = isOwner && ownerCount === 1

  /* ---------------------------------------
     ROLE UPDATE
  --------------------------------------- */
  const handleSetRole = (nextRole: MemberRole) => {
    if (role === nextRole) return

    // prevent removing last owner
    if (isLastOwner && nextRole !== 'owner') {
      toast.error('Organisation must have at least one owner')
      return
    }

    const previousRole = role
    setRole(nextRole)

    startTransition(async () => {
      try {
        await updateMemberRole(memberId, nextRole)
        toast.success(`Role updated to ${nextRole}`)
        await refetchOrganization()
      } catch (err) {
        console.error(err)
        setRole(previousRole) // rollback
        toast.error('Failed to update role')
      }
    })
  }

  /* ---------------------------------------
     ARCHIVE / REINSTATE
  --------------------------------------- */
  const handleArchiveToggle = () => {
    // prevent archiving last owner
    if (!isArchived && isLastOwner) {
      toast.error('You cannot archive the last owner')
      return
    }

    const nextArchived = !isArchived
    setIsArchived(nextArchived)
    onArchivedChange(nextArchived)

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
      } catch (err) {
        console.error(err)
        setIsArchived(!nextArchived)
        onArchivedChange(!nextArchived)
        toast.error('Action failed')
      }
    })
  }

  /* ---------------------------------------
     UI
  --------------------------------------- */
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

      <DropdownMenuContent align='end' className='w-52'>
        {/* ROLE MANAGEMENT */}
        <DropdownMenuItem
          onClick={() => handleSetRole('member')}
          disabled={isPending || role === 'member'}
        >
          <User className='mr-2 size-4' />
          Member
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSetRole('admin')}
          disabled={isPending || role === 'admin'}
        >
          <Shield className='mr-2 size-4' />
          Admin
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleSetRole('owner')}
          disabled={isPending || role === 'owner'}
        >
          <Crown className='mr-2 size-4' />
          Owner
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
