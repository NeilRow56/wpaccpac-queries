'use client'

import { Loader2, Trash2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { archiveUser } from '@/server-actions/users'

interface DeleteUserButtonProps {
  userId: string
}

export default function ArchiveUserButton({ userId }: DeleteUserButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      await archiveUser(userId)
      toast.success('User archive successfully')
      setIsOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete user')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' className='cursor-pointer'>
          <Trash2 className='size-4 text-red-500' />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            Arcchiving this person will prevent them fom accessing the wpaccpac
            system, but retain all data they have been associated with in your
            database.
          </DialogDescription>

          <Button
            disabled={isLoading}
            variant='destructive'
            onClick={handleDelete}
          >
            {isLoading ? <Loader2 className='size-4 animate-spin' /> : 'Delete'}
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
