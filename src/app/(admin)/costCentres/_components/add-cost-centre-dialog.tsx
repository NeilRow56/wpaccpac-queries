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

import { useAction } from 'next-safe-action/hooks'

import { Button } from '@/components/ui/button'

import { useRouter } from 'next/navigation'

import { FormInput } from '@/components/form/form-base'
import { LoadingSwap } from '@/components/shared/loading-swap'
import { Organization } from '@/db/schema/authSchema'
import { CostCentre } from './columns'
import { saveCostCentreAction } from '@/server-actions/cost-centres'
import {
  insertCostCentreSchema,
  insertCostCentreSchemaType
} from '@/zod-schemas/costCentre'

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  organization: Organization // You must have an organization to start a cost center - so it is not optional
  costCentre?: CostCentre
}

function AddCostCentreDialog({
  setOpen,
  open,
  costCentre,
  organization
}: Props) {
  // const searchParams = useSearchParams()
  const router = useRouter()
  const hasCostCentreId = costCentre?.id

  const emptyValues: insertCostCentreSchemaType = {
    id: '',
    name: '',
    organizationId: organization.id ?? ''
  }

  const defaultValues: insertCostCentreSchemaType = hasCostCentreId
    ? {
        id: costCentre?.id ?? 0,
        name: costCentre?.name ?? '',
        organizationId: organization.id ?? ''
      }
    : emptyValues

  const form = useForm<insertCostCentreSchemaType>({
    resolver: zodResolver(insertCostCentreSchema),
    mode: 'onSubmit',
    defaultValues
  })

  useEffect(() => {
    if (costCentre) {
      form.setValue('id', costCentre.id)
      form.setValue('name', costCentre.name)
    }
  }, [costCentre, form])

  const {
    execute: executeSave,

    isPending: isSaving
  } = useAction(saveCostCentreAction, {
    onSuccess({ data }) {
      if (data) {
        toast.success(
          `CostCentre ${costCentre ? 'updated ' : 'added'} successfully`
        )
        router.refresh()
        setOpen(false)
        form.reset()
      }
    },

    onError({ error }) {
      console.log(error)

      toast.error(
        `Failed to ${costCentre ? 'update' : 'add'} cost center. Cost center may already exist`
      )
    }
  })

  async function submitForm(data: insertCostCentreSchemaType) {
    executeSave(data)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className='items-center justify-center'>
                <h2 className='text-primary text-xl font-bold lg:text-2xl'>
                  {costCentre?.id ? 'Edit' : 'New'} Cost Centre{' '}
                  {costCentre?.id ? `#${costCentre.name}` : 'Form'}
                </h2>
              </div>
            </DialogTitle>

            <DialogDescription>
              Create or edit cost centres here. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <Card className='mx-auto w-full border-red-200 sm:max-w-md'>
            <CardHeader className='text-center'>
              <CardTitle></CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id='create-costCentre-form'
                onSubmit={form.handleSubmit(submitForm)}
              >
                <FieldGroup>
                  <FormInput<insertCostCentreSchemaType>
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
                  form='create-costCentre-form'
                  className='w-full max-w-[150px] cursor-pointer dark:bg-blue-600 dark:text-white'
                  disabled={isSaving}
                >
                  <LoadingSwap isLoading={isSaving}>Save</LoadingSwap>
                </Button>
                <Button
                  className='border-red-500'
                  type='button'
                  form='create-costCentre-form'
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
    </>
  )
}

export default AddCostCentreDialog
