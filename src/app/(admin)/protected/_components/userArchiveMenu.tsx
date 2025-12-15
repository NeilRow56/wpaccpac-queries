'use client'

import { useState } from 'react'
import { Archive, RotateCcw, Loader2, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { Button } from '@/components/ui/button'
import { archiveUser, reinstateUser } from '@/server-actions/users'

interface UserArchiveMenuProps {
  userId: string
  isArchived: boolean
}

export function UserArchiveMenu({ userId, isArchived }: UserArchiveMenuProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleAction = async () => {
    try {
      setIsLoading(true)

      if (isArchived) {
        await reinstateUser(userId)
        toast.success('User reinstated successfully')
      } else {
        await archiveUser(userId)
        toast.success('User archived successfully')
      }

      router.refresh()
    } catch (error) {
      console.error(error)
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
              Reinstate user
            </>
          ) : (
            <>
              <Archive className='size-4 text-red-500' />
              Archive user
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
