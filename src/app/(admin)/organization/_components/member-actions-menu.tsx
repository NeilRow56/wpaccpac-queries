'use client'

import { useEffect, useState } from 'react'
import { Archive, RotateCcw, Loader2, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

import {
  archiveUser,
  reinstateUser,
  getUserArchiveInfo
} from '@/server-actions/users'

interface MemberActionsMenuProps {
  userId: string
  onActionComplete: () => Promise<void>
}

export function MemberActionsMenu({
  userId,
  onActionComplete
}: MemberActionsMenuProps) {
  const [isArchived, setIsArchived] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load archive state once
  useEffect(() => {
    getUserArchiveInfo(userId).then(date => {
      setIsArchived(Boolean(date))
    })
  }, [userId])

  if (isArchived === null) return null

  const handleAction = async () => {
    try {
      setIsLoading(true)

      if (isArchived) {
        await reinstateUser(userId)
        toast.success('Member reinstated')
        setIsArchived(false)
      } else {
        await archiveUser(userId)
        toast.success('Member archived')
        setIsArchived(true)
      }

      await onActionComplete()
    } catch (err) {
      console.error(err)
      toast.error('Action failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <MoreVertical className='size-4' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          onClick={handleAction}
          disabled={isLoading}
          className='flex items-center gap-2'
        >
          {isLoading ? (
            <Loader2 className='size-4 animate-spin' />
          ) : isArchived ? (
            <>
              <RotateCcw className='size-4' />
              Reinstate member
            </>
          ) : (
            <>
              <Archive className='size-4 text-red-600' />
              Archive member
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
