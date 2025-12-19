'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldGroup } from '@/components/ui/field'

import { toast } from 'sonner'

import { useRouter } from 'next/navigation'

import { LoadingSwap } from '@/components/shared/loading-swap'
import { authClient } from '@/lib/auth-client'
import { FormInput } from '@/components/form/form-base'

const profileUpdateSchema = z.object({
  name: z.string().min(1),

  email: z.email().min(1)
})

type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>

export type ProfileUser = {
  id: string
  email: string
  name: string
  // orgRole: 'owner' | 'admin' | 'member'
}

export function ProfileUpdateForm({ user }: { user: ProfileUser }) {
  const router = useRouter()

  const form = useForm<ProfileUpdateForm>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: user
  })

  const { isSubmitting } = form.formState

  async function handleProfileUpdate(data: ProfileUpdateForm) {
    const promises = [
      authClient.updateUser({
        name: data.name
      })
    ]

    if (data.email !== user.email) {
      promises.push(
        authClient.changeEmail({
          newEmail: data.email,
          callbackURL: '/settings'
        })
      )
    }

    const res = await Promise.all(promises)

    const updateUserResult = res[0]
    const emailResult = res[1] ?? { error: false }

    if (updateUserResult.error) {
      toast.error(updateUserResult.error.message || 'Failed to update profile')
    } else if (emailResult.error) {
      toast.error(emailResult.error.message || 'Failed to change email')
    } else {
      if (data.email !== user.email) {
        toast.success('Verify your new email address to complete the change.')
      } else {
        toast.success('Profile updated successfully')
      }
      router.refresh()
    }
  }

  return (
    <Card className='mx-auto w-full border-red-200 sm:max-w-md'>
      <CardHeader className='text-center'>
        <CardTitle className='text-2xl'>Profile</CardTitle>
        <CardDescription>Manage your account</CardDescription>
      </CardHeader>
      <CardContent>
        {/* <UserRoleSelect userId={user.id} role={user.orgRole} /> */}
      </CardContent>
      <CardContent>
        <form
          id='profile-update-form'
          onSubmit={form.handleSubmit(handleProfileUpdate)}
        >
          <FieldGroup>
            <FormInput control={form.control} name='name' label='Name' />
            <FormInput control={form.control} name='email' label='Email' />
            <p className='text-sm text-red-400'>
              If you change your email address a verification email will be sent
              to both your current and new email address. The address will not
              change until verification is complete.
            </p>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className=''>
        <Field orientation='horizontal' className='justify-between'>
          <Button
            type='submit'
            form='profile-update-form'
            className='w-full max-w-[150px] cursor-pointer dark:bg-blue-600 dark:text-white'
            disabled={isSubmitting}
          >
            <LoadingSwap isLoading={isSubmitting}>Update Profile</LoadingSwap>
          </Button>
          <Button
            className='border-red-500'
            type='button'
            form='profile-update-form'
            variant='outline'
            onClick={() => form.reset()}
          >
            Reset
          </Button>
        </Field>
      </CardFooter>
    </Card>
  )
}
