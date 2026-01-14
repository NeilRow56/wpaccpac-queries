'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import type { AssetWithCalculations } from '@/lib/asset-calculations'
import {
  assetFormSchema,
  type AssetFormValues
} from '@/zod-schemas/fixedAssets'
import { assetToFormValues } from '@/lib/asset-form-values'

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
import { SelectItem } from '@/components/ui/select'

import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormInputDate,
  FormInputNumberString
} from '@/components/form/form-base'

type SubmitResult = { success: true } | { success: false; error?: string }

type BaseProps = {
  open: boolean
  onClose: () => void
  clientId: string
  categories: Array<{ id: string; name: string; clientId: string }>
}

type CreateProps = BaseProps & {
  mode: 'create'
  onSubmit: (values: AssetFormValues) => Promise<SubmitResult> | SubmitResult
}

type EditProps = BaseProps & {
  mode: 'edit'
  asset: AssetWithCalculations
  onSubmit: (
    values: AssetFormValues & { id: string }
  ) => Promise<SubmitResult> | SubmitResult
}

export type AssetFormProps = CreateProps | EditProps

const emptyDefaults = (clientId: string): AssetFormValues => ({
  name: '',
  clientId,
  categoryId: '',
  description: '',
  originalCost: '',
  costAdjustment: '0',
  acquisitionDate: '',
  depreciationMethod: 'reducing_balance',
  depreciationRate: ''
})

export function AssetForm(props: AssetFormProps) {
  const { open, onClose, clientId, categories, mode } = props
  const asset = mode === 'edit' ? props.asset : null

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: emptyDefaults(clientId)
  })

  // Categories are per-client; if you ever enable cross-client selection, this stays safe.
  const selectedClientId = form.watch('clientId')
  const filteredCategories = categories.filter(
    cat => cat.clientId === selectedClientId
  )

  // When editing and asset changes, load values.
  React.useEffect(() => {
    if (!asset) return
    form.reset(assetToFormValues(asset))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset])

  // When opening create mode, ensure we have the correct clientId in the form.
  React.useEffect(() => {
    if (!open) return
    if (mode === 'create') {
      const current = form.getValues()
      if (current.clientId !== clientId) {
        form.setValue('clientId', clientId, { shouldDirty: false })
      }
    }
  }, [open, mode, clientId, form])

  const handleSubmit = async (values: AssetFormValues) => {
    const result: SubmitResult =
      props.mode === 'edit'
        ? await props.onSubmit({ ...values, id: props.asset.id })
        : await props.onSubmit(values)

    // ✅ Only reset/close on success.
    if (result.success) {
      form.reset(emptyDefaults(clientId))
      onClose()
      return
    }

    // On failure:
    // - do NOT reset
    // - do NOT close
    // The parent already toasts, but keeping form state is the key requirement.
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
          <DialogTitle className='text-primary'>
            {mode === 'edit' ? 'Edit Fixed Asset' : 'Create Fixed Asset'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the details of this asset.'
              : 'Add a new fixed asset to the register.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='asset-form'
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-6'
          >
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              {/* ---------------- Asset details ---------------- */}
              <section className='text-primary space-y-4'>
                <h3 className='text-muted-foreground text-sm font-semibold'>
                  Asset details
                </h3>

                <div className='space-y-2'>
                  <FormSelect
                    control={form.control}
                    name='categoryId'
                    label='Category'
                    className='font-normal text-gray-900'
                    showErrorOnSubmit
                  >
                    {filteredCategories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </FormSelect>

                  <div className='flex items-center justify-between'>
                    <span className='text-muted-foreground text-xs'>
                      Missing a category?
                    </span>
                    <Button
                      asChild
                      variant='link'
                      className='h-auto p-0 text-xs'
                    >
                      <Link
                        href={`/organisation/clients/${clientId}/asset-categories`}
                      >
                        Add asset category
                      </Link>
                    </Button>
                  </div>
                </div>

                <FormInput<AssetFormValues>
                  control={form.control}
                  name='name'
                  className='font-normal text-gray-900'
                  label='Asset name'
                  showErrorOnSubmit
                />
                <FormDescription className='text-muted-foreground font-light'>
                  Add a serial / registration number if available.
                </FormDescription>

                <FormTextarea
                  className='min-h-24 font-normal text-gray-900'
                  control={form.control}
                  name='description'
                  label='Description'
                  showErrorOnSubmit
                />
                <FormDescription className='text-muted-foreground font-light'>
                  Add a detailed description.
                </FormDescription>

                <FormInputDate<AssetFormValues>
                  control={form.control}
                  className='font-normal text-gray-900'
                  name='acquisitionDate'
                  label='Date of acquisition'
                  showErrorOnSubmit
                />

                <FormInputNumberString<AssetFormValues>
                  control={form.control}
                  name='originalCost'
                  label='Original cost'
                  className='font-normal text-gray-900'
                  showErrorOnSubmit
                />

                <FormInputNumberString<AssetFormValues>
                  control={form.control}
                  name='costAdjustment'
                  label='Cost adjustment'
                  className='font-normal text-gray-900'
                  showErrorOnSubmit
                />
                <FormDescription className='text-muted-foreground font-light'>
                  Capitalised improvements or revaluation (added to cost).
                </FormDescription>
              </section>

              {/* ---------------- Depreciation ---------------- */}
              <section className='text-primary space-y-4'>
                <h3 className='text-muted-foreground text-sm font-semibold'>
                  Depreciation
                </h3>

                <FormSelect
                  control={form.control}
                  name='depreciationMethod'
                  label='Depreciation method'
                  className='font-normal text-gray-900'
                  showErrorOnSubmit
                >
                  <SelectItem value='straight_line'>Straight line</SelectItem>
                  <SelectItem value='reducing_balance'>
                    Reducing balance
                  </SelectItem>
                </FormSelect>

                <FormDescription className='text-muted-foreground font-light'>
                  Straight line: equal charge each year. Reducing balance:
                  higher charge in early years.
                </FormDescription>

                <FormInputNumberString<AssetFormValues>
                  control={form.control}
                  name='depreciationRate'
                  label='Depreciation rate (%)'
                  className='font-normal text-gray-900'
                  showErrorOnSubmit
                />

                <FormDescription className='text-muted-foreground font-light'>
                  Annual rate (0–100). For straight line divide 100 by the asset
                  life e.g. 5 year life = 20
                </FormDescription>
              </section>
            </div>

            {/* ---------------- Actions ---------------- */}
            <div className='flex items-center justify-between gap-3 pt-2'>
              <Button
                type='submit'
                className='w-36 dark:bg-blue-600 dark:text-white'
                disabled={form.formState.isSubmitting}
              >
                <LoadingSwap isLoading={form.formState.isSubmitting}>
                  Save
                </LoadingSwap>
              </Button>

              <Button
                type='button'
                variant='outline'
                onClick={() => form.reset(emptyDefaults(clientId))}
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
