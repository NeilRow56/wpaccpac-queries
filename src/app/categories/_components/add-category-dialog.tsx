import React, { useEffect } from 'react'
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
import {
  insertCategorySchemaType,
  insertCategorySchema
} from '@/zod-schemas/clientCategories'

import { useAction } from 'next-safe-action/hooks'

import { Button } from '@/components/ui/button'

import { useRouter } from 'next/navigation'

import { FormInput } from '@/components/form/form-base'
import { LoadingSwap } from '@/components/shared/loading-swap'
import { User } from '@/db/schema/authSchema'
import { saveCategoryAction } from '@/server-actions/client-categories'
import { Category } from './columns'

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  user: User // You must have a user to start a customer - so it is not optional
  category?: Category
}

function AddCategoryDialog({ setOpen, open, category, user }: Props) {
  // const searchParams = useSearchParams()
  const router = useRouter()
  const hasCategoryId = category?.id

  const emptyValues: insertCategorySchemaType = {
    id: 0,
    name: '',
    userId: user.id ?? ''
  }

  const defaultValues: insertCategorySchemaType = hasCategoryId
    ? {
        id: category?.id ?? 0,
        name: category?.name ?? '',
        userId: user.id ?? ''
      }
    : emptyValues

  const form = useForm<insertCategorySchemaType>({
    resolver: zodResolver(insertCategorySchema),
    mode: 'onBlur',
    defaultValues
  })

  useEffect(() => {
    if (category) {
      form.setValue('id', category.id)
      form.setValue('name', category.name)
    }
  }, [category, form])

  const {
    execute: executeSave,

    isPending: isSaving
  } = useAction(saveCategoryAction, {
    onSuccess({ data }) {
      if (data) {
        toast.success(
          `Category ${category ? 'updated ' : 'added'} successfully`
        )
        router.refresh()
        setOpen(false)
        form.reset()
      }
    },

    onError({ error }) {
      console.log(error)

      toast.error(
        `Failed to ${category ? 'update' : 'add'} category. Category may alreay exist`
      )
    }
  })

  async function submitForm(data: insertCategorySchemaType) {
    executeSave(data)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className='items-center justify-center'>
                <h2 className='text-primary text-xl font-bold lg:text-3xl'>
                  {category?.id ? 'Edit' : 'New'} Category{' '}
                  {category?.id ? `#${category.id}` : 'Form'}
                </h2>
              </div>
            </DialogTitle>

            <DialogDescription>
              Create or edit categories here. Click save when you&apos;re done.
            </DialogDescription>
            <Card className='mx-auto w-full border-red-200 sm:max-w-md'>
              <CardHeader className='text-center'>
                <CardTitle></CardTitle>
                <CardDescription></CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  id='create-category-form'
                  onSubmit={form.handleSubmit(submitForm)}
                >
                  <FieldGroup>
                    <FormInput<insertCategorySchemaType>
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
                    form='create-category-form'
                    className='w-full max-w-[150px] cursor-pointer dark:bg-blue-600 dark:text-white'
                    disabled={isSaving}
                  >
                    <LoadingSwap isLoading={isSaving}>Create</LoadingSwap>
                  </Button>
                  <Button
                    className='border-red-500'
                    type='button'
                    form='create-category-form'
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

export default AddCategoryDialog
