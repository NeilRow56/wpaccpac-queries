import React, { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Field, FieldGroup } from '@/components/ui/field'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  insertClientCategorySchemaType,
  insertClientCategorySchema
} from '@/zod-schemas/clientCategories'
import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

import { LoadingSwap } from '@/components/shared/loading-swap'
import { Organization } from '@/db/schema/authSchema'
import { ClientCategory } from './columns'
import { saveClientCategoryAction } from '@/server-actions/client-categories'
import { FormInput } from '@/components/form/form-base'

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  organization: Organization
  clientCategory?: ClientCategory
}

function AddCategoryDialog({
  setOpen,
  open,
  clientCategory,
  organization
}: Props) {
  const router = useRouter()
  const hasClientCategoryId = clientCategory?.id

  const emptyValues: insertClientCategorySchemaType = {
    id: '',
    name: '',
    organizationId: organization.id ?? ''
  }

  const defaultValues: insertClientCategorySchemaType = hasClientCategoryId
    ? {
        id: clientCategory?.id ?? '',
        name: clientCategory?.name ?? '',
        organizationId: organization.id ?? ''
      }
    : emptyValues

  const form = useForm<insertClientCategorySchemaType>({
    resolver: zodResolver(insertClientCategorySchema),
    mode: 'onBlur',
    defaultValues
  })

  useEffect(() => {
    if (clientCategory) {
      form.setValue('id', clientCategory.id)
      form.setValue('name', clientCategory.name)
    }
  }, [clientCategory, form])

  const { execute: executeSave, isPending: isSaving } = useAction(
    saveClientCategoryAction,
    {
      onSuccess({ data }) {
        if (data) {
          toast.success(
            `Category ${clientCategory ? 'updated' : 'added'} successfully`
          )
          router.refresh()
          setOpen(false)
          form.reset()
        }
      },
      onError({ error }) {
        console.log(error)
        toast.error(
          `Failed to ${clientCategory ? 'update' : 'add'} category. Category may already exist`
        )
      }
    }
  )

  async function submitForm(data: insertClientCategorySchemaType) {
    executeSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {clientCategory?.id ? 'Edit' : 'New'} Category{' '}
            {clientCategory?.id ? `#${clientCategory.id}` : 'Form'}
          </DialogTitle>

          <DialogDescription>
            Create or edit categories here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        <form
          id='create-client-category-form'
          onSubmit={form.handleSubmit(submitForm)}
          className='space-y-4'
        >
          <FieldGroup>
            <FormInput<insertClientCategorySchemaType>
              control={form.control}
              name='name'
              label='Name'
            />
          </FieldGroup>

          <Field orientation='horizontal' className='justify-start gap-2'>
            <Button
              type='submit'
              form='create-client-category-form'
              disabled={isSaving}
            >
              <LoadingSwap isLoading={isSaving}>
                {clientCategory?.id ? 'Update' : 'Create'}
              </LoadingSwap>
            </Button>

            <Button
              type='button'
              variant='outline'
              onClick={() => form.reset(defaultValues)}
            >
              Reset
            </Button>
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddCategoryDialog
