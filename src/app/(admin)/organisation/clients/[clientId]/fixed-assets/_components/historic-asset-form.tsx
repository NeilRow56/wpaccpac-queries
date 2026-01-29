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
  type CreateHistoricAssetInput,
  type CreateHistoricAssetValues
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
  onSubmit: (values: CreateHistoricAssetValues) => Promise<void> | void
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB')
}

const emptyDefaults = (
  clientId: string,
  periodId: string
): CreateHistoricAssetInput => ({
  clientId,
  periodId,

  name: '',
  categoryId: '',
  description: '',

  // ✅ NEW
  isFinanceLease: false,

  acquisitionDate: '',
  originalCost: '',
  costAdjustment: '0',

  depreciationMethod: 'reducing_balance',
  depreciationRate: '',

  openingAccumulatedDepreciation: ''
})

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
    defaultValues: emptyDefaults(clientId, periodId)
  })

  // Keep IDs in sync if props change.
  React.useEffect(() => {
    form.setValue('clientId', clientId, { shouldDirty: false })
    form.setValue('periodId', periodId, { shouldDirty: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, periodId])

  const handleSubmit = async (values: CreateHistoricAssetInput) => {
    const parsed = createHistoricAssetSchema.parse(values) // ✅ defaults/transforms applied
    await onSubmit(parsed)

    form.reset(emptyDefaults(clientId, periodId))
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) onClose()
      }}
    >
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
            <AssetFields
              control={form.control}
              watchClientId={clientId}
              clientIdForLinks={clientId}
              categories={categories}
            />

            <section className='space-y-3 pt-2'>
              <h3 className='text-primary text-sm font-semibold'>
                Opening balances
              </h3>

              <FormInputNumberString<CreateHistoricAssetInput>
                control={form.control}
                name='openingAccumulatedDepreciation'
                label={`Opening accumulated depreciation (as at ${formatDate(
                  periodStartDate
                )})`}
                className='font-normal text-gray-900'
                showErrorOnSubmit
              />

              <FormDescription className='text-muted-foreground font-light'>
                Enter accumulated depreciation at the start of the current
                period.
              </FormDescription>
            </section>

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
                onClick={() => form.reset(emptyDefaults(clientId, periodId))}
                disabled={form.formState.isSubmitting}
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
