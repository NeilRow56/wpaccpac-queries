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

import { FormInput } from '@/components/form/form-base'

import { z } from 'zod/v4'
import { toast } from 'sonner'
import { useState } from 'react'

import { LoadingSwap } from '@/components/shared/loading-swap'
import { authClient } from '@/lib/auth-client'

const formSchema = z.object({
  email: z.email()
})

export function ForgotPasswordForm() {
  const [isPending, setPending] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: ''
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setPending(true)

    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: '/auth/reset-password'
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password reset email sent')
    }

    setPending(false)
  }

  return (
    <Card className='flex w-full max-w-md overflow-hidden p-6'>
      <CardHeader className='text-center'>
        <CardTitle className='text-primary'>Forgot Password?</CardTitle>
        <CardDescription>
          Please enter your email. A link will be sent to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex w-full p-6'>
        <form id='forgot-password-form' onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className='min-w-[348px]'>
            <FormInput control={form.control} name='email' label='Email' />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className='max-w-[310px]'>
        <Field orientation='horizontal'>
          <Button
            type='submit'
            form='forgot-password-form'
            className='w-full cursor-pointer dark:bg-blue-600 dark:text-white'
            disabled={isPending}
          >
            <LoadingSwap isLoading={isPending}>Send</LoadingSwap>
          </Button>
          <Button
            className='border-red-500'
            type='button'
            form='forgot-password-form'
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
