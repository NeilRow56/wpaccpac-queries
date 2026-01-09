/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSwap } from '@/components/shared/loading-swap'
import { Form, FormDescription } from '@/components/ui/form'

import {
  createHistoricAssetSchema,
  type CreateHistoricAssetInput
} from '@/zod-schemas/fixedAssets'
import { FormInputNumberString } from '@/components/form/form-base'
import { AssetFields } from './asset-fields'

type HistoricAssetFormProps = {
  open: boolean
  onClose: () => void
  clientId: string
  periodId: string
  periodStartDate: Date
  categories: Array<{ id: string; name: string; clientId: string }>
  onSubmit: (values: CreateHistoricAssetInput) => Promise<void> | void
}

function formatDate(d: Date) {
  // keep simple; you can swap to date-fns/Intl if you prefer
  return d.toLocaleDateString()
}

export function HistoricAssetForm({
  open,
  onClose,
  clientId,
  periodId,
  periodStartDate,
  categories,
  onSubmit
}: HistoricAssetFormProps) {
  const form = useForm<CreateHistoricAssetInput>({
    resolver: zodResolver(createHistoricAssetSchema),
    defaultValues: {
      clientId,
      periodId,

      name: '',
      categoryId: '',
      description: '',

      acquisitionDate: '',
      originalCost: '',
      costAdjustment: '0',

      depreciationMethod: 'reducing_balance',
      depreciationRate: '',

      openingAccumulatedDepreciation: ''
    }
  })

  // If these props change (switching client/period), keep the form in sync.
  React.useEffect(() => {
    form.setValue('clientId', clientId)
    form.setValue('periodId', periodId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, periodId])

  const handleSubmit = async (values: CreateHistoricAssetInput) => {
    await onSubmit(values)
    form.reset({
      clientId,
      periodId,
      name: '',
      categoryId: '',
      description: '',
      acquisitionDate: '',
      originalCost: '',
      costAdjustment: '0',
      depreciationMethod: 'reducing_balance',
      depreciationRate: '',
      openingAccumulatedDepreciation: ''
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-h-[90vh] w-full min-w-4xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-primary'>Add Historic Asset</DialogTitle>
          <DialogDescription>
            Create a historic asset and capture its opening accumulated
            depreciation as at the start of the current period.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='historic-asset-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-6'
          >
            {/* Shared fields */}
            <AssetFields
              control={form.control}
              watchClientId={clientId}
              clientIdForLinks={clientId}
              categories={categories}
            />

            {/* Opening balances */}
            <section className='space-y-3 pt-2'>
              <h3 className='text-muted-foreground text-sm font-semibold'>
                Opening balances
              </h3>

              <FormInputNumberString<any>
                control={form.control}
                name={'openingAccumulatedDepreciation' as any}
                label={`Opening accumulated depreciation (as at ${formatDate(
                  periodStartDate
                )})`}
                className='font-normal text-gray-900'
              />
              <FormDescription className='text-muted-foreground font-light'>
                Enter accumulated depreciation at the start of the current
                period.
              </FormDescription>
            </section>

            {/* Actions */}
            <div className='flex items-center justify-between gap-3 pt-2'>
              <Button
                type='submit'
                className='w-44 dark:bg-blue-600 dark:text-white'
                disabled={form.formState.isSubmitting}
              >
                <LoadingSwap isLoading={form.formState.isSubmitting}>
                  Create historic asset
                </LoadingSwap>
              </Button>

              <Button
                type='button'
                variant='outline'
                onClick={() => form.reset()}
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
