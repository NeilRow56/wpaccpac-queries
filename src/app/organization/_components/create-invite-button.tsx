'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import z from 'zod'

import { Button } from '@/components/ui/button'

import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { useState } from 'react'
import { SelectContent, SelectItem } from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldGroup } from '@/components/ui/field'
import { FormInput, FormSelect } from '@/components/form/form-base'
import { authClient } from '@/lib/auth-client'
import { LoadingSwap } from '@/components/shared/loading-swap'

const createInviteSchema = z.object({
  email: z.email().min(1).trim(),
  role: z.enum(['member', 'admin'])
})

type CreateInviteFormType = z.infer<typeof createInviteSchema>

export function CreateInviteButton() {
  const [open, setOpen] = useState(false)

  const form = useForm<CreateInviteFormType>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      email: '',
      role: 'member'
    }
  })

  const { isSubmitting } = form.formState

  async function handleCreateInvite(data: CreateInviteFormType) {
    await authClient.organization.inviteMember(data, {
      onError: error => {
        toast.error(error.error.message || 'Failed to invite user')
      },
      onSuccess: () => {
        form.reset()
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='cursor-pointer'>Invite User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a user to collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        <Card className='mx-auto w-full border-red-200 sm:max-w-md'>
          <CardHeader className='text-center'>
            <CardTitle></CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent>
            <form
              id='create-invite-form'
              onSubmit={form.handleSubmit(handleCreateInvite)}
            >
              <FieldGroup>
                <FormInput<CreateInviteFormType>
                  control={form.control}
                  name='email'
                  label='Email'
                />
                <FormSelect control={form.control} name='role' label='Role'>
                  <SelectContent>
                    <SelectItem value='member'>Member</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </FormSelect>
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className=''>
            <Field orientation='horizontal' className='justify-between'>
              <Button
                type='submit'
                form='create-invite-form'
                className='w-full max-w-[150px] cursor-pointer dark:bg-blue-600 dark:text-white'
                disabled={isSubmitting}
              >
                <LoadingSwap isLoading={isSubmitting}>Invite</LoadingSwap>
              </Button>
              <Button
                className='border-red-500'
                type='button'
                form='create-invite-form'
                variant='outline'
                onClick={() => form.reset()}
              >
                Reset
              </Button>
            </Field>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
