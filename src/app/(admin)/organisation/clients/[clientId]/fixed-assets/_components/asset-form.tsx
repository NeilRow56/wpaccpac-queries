'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { AssetWithCalculations } from '@/lib/asset-calculations'
import { assetFormSchema, AssetFormValues } from '@/zod-schemas/fixedAssets'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'

import {
  FormInput,
  FormTextarea,
  FormInputDate,
  FormInputNumberString
} from '@/components/form/form-base'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { Button } from '@/components/ui/button'
import { LoadingSwap } from '@/components/shared/loading-swap'
import Link from 'next/link'

/* ----------------------------------
 * Props
 * ---------------------------------- */

type BaseProps = {
  open: boolean
  onClose: () => void
  clientId: string
  categories: Array<{ id: string; name: string; clientId: string }>
}

type CreateProps = BaseProps & {
  mode: 'create'
  onSubmit: (values: AssetFormValues) => void
}

type EditProps = BaseProps & {
  mode: 'edit'
  asset: AssetWithCalculations
  onSubmit: (values: AssetFormValues & { id: string }) => void
}

export type AssetFormProps = CreateProps | EditProps

/* ----------------------------------
 * Helper
 * ---------------------------------- */

function assetToFormValues(asset: AssetWithCalculations): AssetFormValues {
  return {
    name: asset.name,
    clientId: asset.clientId,
    categoryId: asset.categoryId ?? '',
    description: asset.description ?? '',
    cost: asset.cost.toString(),
    costAdjustment: asset.costAdjustment?.toString() ?? '0',
    depreciationAdjustment: asset.depreciationAdjustment?.toString() ?? '0',
    dateOfPurchase: new Date(asset.dateOfPurchase).toISOString().slice(0, 10),
    depreciationMethod: asset.depreciationMethod,
    depreciationRate: asset.depreciationRate.toString(),
    totalDepreciationToDate: asset.totalDepreciationToDate?.toString() ?? '0',
    disposalValue: asset.disposalValue?.toString() ?? ''
  }
}

/* ----------------------------------
 * Component
 * ---------------------------------- */

export function AssetForm(props: AssetFormProps) {
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: '',
      clientId: props.clientId,
      categoryId: '',
      description: '',
      cost: '',
      costAdjustment: '0',
      depreciationAdjustment: '0',
      dateOfPurchase: '',
      depreciationMethod: 'reducing_balance',
      depreciationRate: '',
      totalDepreciationToDate: '0',
      disposalValue: ''
    }
  })

  React.useEffect(() => {
    if (props.mode === 'edit') {
      form.reset(assetToFormValues(props.asset))
    }
  }, [props, form])

  const filteredCategories = props.categories.filter(
    c => c.clientId === props.clientId
  )

  const handleSubmit = (values: AssetFormValues) => {
    if (props.mode === 'edit') {
      props.onSubmit({ ...values, id: props.asset.id })
    } else {
      props.onSubmit(values)
    }

    form.reset()
    props.onClose()
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onClose}>
      <DialogContent className='max-h-[90vh] min-w-4xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {props.mode === 'edit' ? 'Edit Fixed Asset' : 'Create Fixed Asset'}
          </DialogTitle>
          <DialogDescription>
            {props.mode === 'edit'
              ? 'Update the asset details.'
              : 'Add a new asset to the register.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-6'
          >
            <FormField
              control={form.control}
              name='categoryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select category' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button asChild size='sm'>
              <Link
                href={`/organisation/clients/${props.clientId}/asset-categories`}
              >
                Add asset category
              </Link>
            </Button>

            <FormInput name='name' label='Asset name' control={form.control} />
            <FormTextarea
              name='description'
              label='Description'
              control={form.control}
            />

            <FormInputNumberString
              name='cost'
              label='Cost'
              control={form.control}
            />

            <FormInputDate
              name='dateOfPurchase'
              label='Date of acquisition'
              control={form.control}
            />

            <Button type='submit' disabled={form.formState.isSubmitting}>
              <LoadingSwap isLoading={form.formState.isSubmitting}>
                Save
              </LoadingSwap>
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
