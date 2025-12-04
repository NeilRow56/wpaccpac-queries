'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

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

import { FormPasswordInput } from '@/components/form/form-base'

import { z } from 'zod/v4'
import { toast } from 'sonner'

import { LoadingSwap } from '@/components/shared/loading-swap'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

const passwordSchema = z
  .string()
  .min(1, { message: 'Password is required' })
  .min(8, { message: 'Password must be at least 8 characters' })
  .regex(/[^A-Za-z0-9]/, {
    message:
      'Password must contain at least one special character i.e. not a number or letter'
  })

const resetPasswordSchema = z.object({
  password: passwordSchema
})

type ResetPasswordFormType = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const error = searchParams.get('error')
  const form = useForm<ResetPasswordFormType>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: ''
    }
  })

  const { isSubmitting } = form.formState

  async function handleResetPassword(values: ResetPasswordFormType) {
    if (token == null) return

    await authClient.resetPassword(
      {
        newPassword: values.password,
        token
      },
      {
        onError: error => {
          toast.error(error.error.message || 'Failed to reset password')
        },
        onSuccess: () => {
          toast.success('Password reset successful', {
            description: 'Redirection to login...'
          })
          setTimeout(() => {
            router.push('/auth')
          }, 1000)
        }
      }
    )
  }

  if (token == null || error != null) {
    return (
      <div className='my-6 px-4'>
        <Card className='mx-auto w-full max-w-md'>
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              The password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className='w-full' asChild>
              <Link href='/auth/login'>Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card className='flex w-[300px] overflow-hidden p-6 md:w-[465px]'>
      <CardHeader className='text-center'>
        <CardTitle className='text-primary'>Reset Password?</CardTitle>
        <CardDescription>Please enter your new password.</CardDescription>
      </CardHeader>
      <CardContent className='flex w-full p-6'>
        <form
          id='reset-password-form'
          onSubmit={form.handleSubmit(handleResetPassword)}
        >
          <FieldGroup className='w-[200px] md:min-w-[348px]'>
            <FormPasswordInput
              control={form.control}
              name='password'
              label='Password'
            />

            <div>
              <h3 className='text-xs text-blue-500'>
                Min. 8 characters including at least one special character.
              </h3>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className='flex max-w-40 md:max-w-[390px]'>
        <Field orientation='horizontal' className='justify-between'>
          <Button
            type='submit'
            form='reset-password-form'
            className='w-full max-w-[150px] cursor-pointer dark:bg-blue-600 dark:text-white'
            disabled={isSubmitting}
          >
            <LoadingSwap isLoading={isSubmitting}>Submit</LoadingSwap>
          </Button>
          <Button
            className='border-red-500'
            type='button'
            form='reset-password-form'
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
