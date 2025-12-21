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
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Field, FieldGroup } from '@/components/ui/field'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/form/form-base'
import { LoadingSwap } from '@/components/shared/loading-swap'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'

const formSchema = z.object({
  name: z.string().min(2).max(50)
})

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  sessionUserId: string // Pass the authenticated user's id from session
}

export function AddOrganizationDialog({ setOpen, open }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      // Generate slug
      const slug = values.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 50)

      // Check slug uniqueness
      const { error: slugError } = await authClient.organization.checkSlug({
        slug
      })
      if (slugError) {
        form.setError('name', {
          type: 'manual',
          message: 'Name is already in use. Choose a different name.'
        })
        return
      }

      // Create organization (client-side safe)
      const { data, error } = await authClient.organization.create({
        name: values.name,
        slug
      })

      if (error || !data?.id) {
        console.error('[org.create]', error)
        form.setError('name', {
          type: 'manual',
          message: error?.message ?? 'Failed to create organization'
        })
        return
      }

      const orgId = data.id

      // Set organization as active
      await authClient.organization.setActive({ organizationId: orgId })

      // Success toast & refresh
      toast.success('Organization created successfully!')
      router.refresh()
      setOpen(false)
      form.reset()
    } catch (err) {
      console.error('[org.create]', err)
      toast.error('Unexpected error occurred while creating organization.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Fill in the name and click create to add a new organization.
          </DialogDescription>
        </DialogHeader>

        <Card className='mx-auto w-full sm:max-w-md'>
          <CardHeader>
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
                  label='Organization Name'
                />
              </FieldGroup>
            </form>
          </CardContent>

          <CardFooter>
            <Field orientation='horizontal' className='justify-between'>
              <Button
                type='submit'
                form='create-organization-form'
                className='w-full max-w-[150px]'
                disabled={isLoading}
              >
                <LoadingSwap isLoading={isLoading}>Create</LoadingSwap>
              </Button>
              <Button
                variant='outline'
                type='button'
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

export default AddOrganizationDialog
