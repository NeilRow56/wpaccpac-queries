'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

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
import { useRouter, useSearchParams } from 'next/navigation'
import { FormInput, FormPasswordInput } from '@/components/form/form-base'
import { LoadingSwap } from '@/components/shared/loading-swap'
import { signUp } from '@/server-actions/users'

/** ------------------------
 *  1. Zod schema
 * ------------------------ */
const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .regex(/[^A-Za-z0-9]/, {
    message: 'Password must contain at least one special character e.g. ! or *'
  })

const registerSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    email: z.email('Please enter a valid email address!'),
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  })

type RegisterSchemaType = z.infer<typeof registerSchema>

/** ------------------------
 *  2. Props with optional redirect
 * ------------------------ */
interface RegisterFormProps {
  redirectTo?: string
}

/** ------------------------
 *  3. Helper to validate redirect paths
 *     (prevents open redirect attacks)
 * ------------------------ */
function validateRedirect(url?: string) {
  if (!url) return undefined
  try {
    const u = new URL(url, window.location.origin)
    // Only allow same-origin redirects
    if (u.origin === window.location.origin) return u.pathname + u.search
    return undefined
  } catch {
    return undefined
  }
}

/** ------------------------
 *  4. RegisterForm component
 * ------------------------ */
export default function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const form = useForm<RegisterSchemaType>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: RegisterSchemaType) {
    try {
      const { success, message } = await signUp(
        values.email,
        values.password,
        values.name
      )

      if (!success) {
        toast.error(message as string)
        return
      }

      toast.success(
        `${message as string} Please check your email for verification.`
      )

      const inviteId = searchParams.get('invite')

      if (inviteId) {
        router.replace(`/organization/invites/${inviteId}`)
        return
      }

      // Fallback safe redirect
      const safeRedirect = validateRedirect(redirectTo) ?? '/dashboard'
      router.replace(safeRedirect)

      form.reset()
    } catch (error) {
      console.error(error)
      toast.error('Unexpected error during registration')
    }
  }

  return (
    <Card className='mx-auto w-full sm:max-w-md'>
      <CardHeader className='text-center'>
        <CardTitle>Welcome to WpAccPac!</CardTitle>
        <CardDescription>Create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form id='registration-form' onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <FormInput control={form.control} name='name' label='Name' />
            <FormInput control={form.control} name='email' label='Email' />
            <FormPasswordInput
              control={form.control}
              name='password'
              label='Password'
            />
            <div>
              <h3 className='text-xs text-blue-500'>
                Min. 8 characters and at least one special character e.g. ! or *
              </h3>
            </div>
            <FormPasswordInput
              control={form.control}
              name='confirmPassword'
              label='Confirm Password'
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation='horizontal' className='justify-between'>
          <Button
            type='submit'
            form='registration-form'
            className='w-full max-w-[150px]'
            disabled={isSubmitting}
          >
            <LoadingSwap isLoading={isSubmitting}>Sign up</LoadingSwap>
          </Button>
          <Button
            type='button'
            form='registration-form'
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
