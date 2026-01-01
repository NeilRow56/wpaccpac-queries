import React, { useEffect, useMemo } from 'react'
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

import { Button } from '@/components/ui/button'

import { useRouter } from 'next/navigation'

import { FormInput } from '@/components/form/form-base'
import { LoadingSwap } from '@/components/shared/loading-swap'

import { saveCostCentreAction } from '@/server-actions/cost-centres'
import {
  costCentreFormSchema,
  CostCentreFormValues
} from '@/zod-schemas/costCentre'
import { OrganizationSchema } from '@/zod-schemas/organizations'

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  organization: ReturnType<typeof OrganizationSchema.parse>
  // organization: Organization // You must have an organization to start a cost center - so it is not optional
  costCentre?: CostCentreDialogType
}

export type CostCentreInsertPayload = {
  id?: string
  name: string
  organizationId: string
}

// -----------------------------------------
// Empty cost centre template
// -----------------------------------------
const initialEmptyCostCentre: Omit<CostCentreFormValues, 'organizationId'> = {
  // id: '',
  name: ''
}

// UI Component

function AddCostCentreDialog({
  setOpen,
  open,
  costCentre,
  organization
}: Props) {
  // const searchParams = useSearchParams()
  const router = useRouter()

  // -----------------------------------------
  // Initial values (for edit or new client)
  // -----------------------------------------

  const normalizedInitialValues = useMemo<CostCentreFormValues>(() => {
    if (costCentre) {
      return normalizeCostCentreForInsert(costCentre, organization.id)
    }

    return {
      ...initialEmptyCostCentre,
      organizationId: organization.id
    }
  }, [costCentre, organization.id])

  // -----------------------------------------
  // Form setup
  // -----------------------------------------

  const form = useForm<CostCentreFormValues>({
    resolver: zodResolver(costCentreFormSchema),
    defaultValues: normalizedInitialValues
  })

  // -----------------------------------------
  // Reset form ONLY when dialog opens or cost centre changes
  // -----------------------------------------
  useEffect(() => {
    if (open) {
      form.reset(normalizedInitialValues)
    }
  }, [open, normalizedInitialValues, form])

  const handleSubmit = async (values: CostCentreDialogType) => {
    try {
      const payload = normalizeCostCentreForInsert(values, organization.id)

      const result = await saveCostCentreAction(payload)

      if (result.serverError) {
        toast.error(result.serverError)
        return
      }

      if (result.validationErrors) {
        toast.error('Validation failed')
        return
      }

      if (!result.data?.success) {
        toast.error(result.data?.message ?? 'Operation failed')
        return
      }

      toast.success(result.data.message ?? 'Cost centre saved successfully')

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Unexpected cost centre error')
    }
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
                onSubmit={form.handleSubmit(handleSubmit)}
              >
                <FieldGroup>
                  <FormInput<CostCentreFormValues>
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
                  disabled={form.formState.isSubmitting}
                >
                  <LoadingSwap isLoading={form.formState.isSubmitting}>
                    Save
                  </LoadingSwap>
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

// -----------------------------------------
// Types and normalization ( Ui + DB)
// -----------------------------------------

export type CostCentreDialogType = {
  id?: string
  name: string
}

function normalizeCostCentreForInsert(
  values: CostCentreDialogType,
  organizationId: string
): CostCentreInsertPayload {
  return {
    id: values.id,
    name: values.name,
    organizationId
  }
}
