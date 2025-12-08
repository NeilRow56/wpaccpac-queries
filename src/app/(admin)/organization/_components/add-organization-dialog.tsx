'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldGroup } from '@/components/ui/field'

import { useForm } from 'react-hook-form'

import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'

import { useRouter } from 'next/navigation'

import { FormInput } from '@/components/form/form-base'
import { LoadingSwap } from '@/components/shared/loading-swap'
import { authClient } from '@/lib/auth-client'
import { Organization } from '@/db/schema/authSchema'

const formSchema = z.object({
  name: z.string().min(2).max(50)
})

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>

  organization?: Organization
}

export function AddOrganizationDialog({ setOpen, open, organization }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: ''
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const slug = values.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50)

    const { error } = await authClient.organization.checkSlug({ slug })

    if (error) {
      form.setError('name', {
        type: 'manual',
        message:
          'Name is already in use by another business. Please choose a slightly amended name'
      })
      return
    }

    try {
      setIsLoading(true)
      const res = await authClient.organization.create({
        name: values.name,
        slug
      })

      if (res.error) {
        toast.error(res.error.message || 'Failed to create organization')
      } else {
        await authClient.organization.setActive({
          organizationId: res.data?.id
        })
        toast.success('Organization created successfully')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
      setOpen(false)
      form.reset()
      router.refresh()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className='items-center justify-center'>
                <h2 className='text-primary text-xl font-bold lg:text-3xl'>
                  {organization?.id ? 'Edit' : 'New'} Organization{' '}
                  {organization?.id ? `#${organization.id}` : 'Form'}
                </h2>
              </div>
            </DialogTitle>

            <DialogDescription>
              Create organizations here. Click create when you&apos;re done.
            </DialogDescription>
            <Card className='mx-auto w-full border-red-200 sm:max-w-md'>
              <CardHeader className='text-center'>
                <CardTitle></CardTitle>
                <CardDescription></CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  id='create-organization-form'
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  <FieldGroup>
                    <FormInput
                      control={form.control}
                      name='name'
                      label='Name'
                    />
                  </FieldGroup>
                </form>
              </CardContent>
              <CardFooter className=''>
                <Field orientation='horizontal' className='justify-between'>
                  <Button
                    type='submit'
                    form='create-organization-form'
                    className='w-full max-w-[150px] cursor-pointer dark:bg-blue-600 dark:text-white'
                    disabled={isLoading}
                  >
                    <LoadingSwap isLoading={isLoading}>Create</LoadingSwap>
                  </Button>
                  <Button
                    className='border-red-500'
                    type='button'
                    form='create-organization-form'
                    variant='outline'
                    onClick={() => form.reset()}
                  >
                    Reset
                  </Button>
                </Field>
              </CardFooter>
            </Card>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AddOrganizationDialog
