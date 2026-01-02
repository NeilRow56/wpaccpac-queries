/* eslint-disable react-hooks/incompatible-library */
'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'

import { AssetWithCalculations } from '@/lib/asset-calculations'
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormInputDate,
  FormInputNumberString
} from '@/components/form/form-base'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { assetFormSchema, AssetFormValues } from '@/zod-schemas/fixedAssets'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldGroup } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { LoadingSwap } from '@/components/shared/loading-swap'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
// import { depreciation_methods } from '@/lib/constants'
import Link from 'next/link'

type BaseProps = {
  open: boolean
  onClose: () => void
  // clients: Array<{ id: string; name: string }>
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

export function AssetForm(props: AssetFormProps) {
  const { open, onClose, clientId, categories } = props
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: '',
      clientId,
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

  const selectedClientId = form.watch('clientId')
  const filteredCategories = categories.filter(
    cat => cat.clientId === selectedClientId
  )

  React.useEffect(() => {
    if (props.mode === 'edit' && props.asset) {
      const formattedDate = new Date(props.asset.dateOfPurchase)
        .toISOString()
        .split('T')[0]

      form.reset({
        name: props.asset.name,
        clientId: props.asset.clientId,
        categoryId: props.asset.categoryId?.toString(),
        description: props.asset.description ?? '',
        cost: props.asset.cost.toString(),
        dateOfPurchase: formattedDate,
        costAdjustment: props.asset.costAdjustment?.toString() ?? '0',
        depreciationAdjustment: props.asset.costAdjustment?.toString() ?? '0',
        depreciationMethod: props.asset.depreciationMethod,
        depreciationRate: props.asset.depreciationRate.toString(),
        totalDepreciationToDate: props.asset.totalDepreciationToDate.toString(),
        disposalValue: props.asset.disposalValue?.toString() ?? ''
      })
    }
  }, [props, form])

  const handleSubmit = (values: AssetFormValues) => {
    if (props.mode === 'edit') {
      // TypeScript KNOWS this is EditProps here
      if (!props.asset) return

      props.onSubmit({
        ...values,
        id: props.asset.id
      })
    } else {
      // TypeScript KNOWS this is CreateProps here
      props.onSubmit(values)
    }

    form.reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-h-[90vh] min-w-4xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-primary'>
            {props.mode === 'edit' ? 'Edit Fixed Asset' : 'Create Fixed Asset'}
          </DialogTitle>
          <DialogDescription>
            {props.mode === 'edit'
              ? 'Update the details of this asset.'
              : 'Add a new fixed asset to the register.'}
          </DialogDescription>
        </DialogHeader>

        <Card className='mx-auto w-full'>
          <CardHeader className='text-center'>
            <CardTitle></CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form id='asset-form' onSubmit={form.handleSubmit(handleSubmit)}>
                <FieldGroup>
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8'>
                    <div className='text-primary min-w-0 space-y-4 font-bold'>
                      {/* Client dropdown: display DB value as-is for correct selection */}
                      {/* <FormSelect
                        control={form.control}
                        name='clientId'
                        label='Client'
                      >
                        {clients.map(cc => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.name}
                          </SelectItem>
                        ))}
                      </FormSelect> */}
                      <FormSelect
                        control={form.control}
                        name='categoryId'
                        label='Category'
                        className='font-normal text-gray-900'
                      >
                        {filteredCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </FormSelect>
                      <Button asChild size='sm'>
                        <Link
                          href={`/organisation/clients/${clientId}/asset-categories`}
                        >
                          <span className='text-sm text-white'>
                            Add asset category
                          </span>
                        </Link>
                      </Button>
                      <FormInput<AssetFormValues>
                        control={form.control}
                        name='name'
                        className='font-normal text-gray-900'
                        label='Asset Name'
                      />
                      <FormDescription className='text-muted-foreground font-light'>
                        Name (add serial or registration number if availabe)
                      </FormDescription>
                      <FormTextarea
                        className='min-h-24 font-normal text-gray-900'
                        control={form.control}
                        name='description'
                        label='Description'
                      />
                      <FormDescription className='text-muted-foreground font-light'>
                        Add a detailed description
                      </FormDescription>
                      <FormInputNumberString<AssetFormValues>
                        control={form.control}
                        name='cost'
                        label='Cost'
                        className='font-normal text-gray-900'
                      />
                      <FormInputNumberString<AssetFormValues>
                        control={form.control}
                        name='costAdjustment'
                        label='Cost adjustment'
                        className='font-normal text-gray-900'
                      />
                      <FormDescription className='text-muted-foreground font-light'>
                        Capitalised improvements or revaluation (added to cost)
                      </FormDescription>

                      <FormInputNumberString<AssetFormValues>
                        control={form.control}
                        name='depreciationAdjustment'
                        label='Depreciation adjustment'
                        className='font-normal text-gray-900'
                      />
                      <FormDescription className='text-muted-foreground font-light'>
                        Impairment or write-down (does not affect future
                        depreciation)
                      </FormDescription>
                    </div>
                    <div className='text-primary min-w-0 space-y-4 font-bold'>
                      <FormInputDate<AssetFormValues>
                        control={form.control}
                        className='font-normal text-gray-900'
                        name='dateOfPurchase'
                        label='Date of acquiition'
                      />
                      <FormField
                        control={form.control}
                        name='depreciationMethod'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Depreciation Method *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder='Select method' />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value='straight_line'>
                                  Straight Line
                                </SelectItem>
                                <SelectItem value='reducing_balance'>
                                  Reducing Balance
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Straight line: Equal depreciation each year
                              <br />
                              Reducing balance: Higher depreciation in early
                              years
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* <FormSelect
                        control={form.control}
                        name='depreciationMethod'
                        label='Depreciation Method'
                        className='font-normal text-gray-900'
                      >
                        {depreciation_methods.map(dm => (
                          <SelectItem key={dm.id} value={dm.id}>
                            {dm.description}
                          </SelectItem>
                        ))}
                      </FormSelect> */}

                      <FormInputNumberString<AssetFormValues>
                        control={form.control}
                        name='depreciationRate'
                        label='Depreciation Rate (%)'
                        className='font-normal text-gray-900'
                      />
                      <FormDescription className='text-muted-foreground font-light'>
                        Annual rate (0-100)
                      </FormDescription>
                      <FormInputNumberString<AssetFormValues>
                        control={form.control}
                        name='totalDepreciationToDate'
                        label='Total Depreciation To Date'
                        className='font-normal text-gray-900'
                      />

                      <FormDescription className='text-muted-foreground font-light'>
                        Previously recorded
                      </FormDescription>
                      <FormInputNumberString<AssetFormValues>
                        control={form.control}
                        name='disposalValue'
                        label='Expected residual value'
                        className='font-normal text-gray-900'
                      />
                    </div>
                  </div>
                </FieldGroup>
              </form>
            </Form>
          </CardContent>

          <CardFooter>
            <Field orientation='horizontal' className='justify-between'>
              <Button
                type='submit'
                form='asset-form'
                className='w-full max-w-[150px] dark:bg-blue-600 dark:text-white'
                disabled={form.formState.isSubmitting}
              >
                <LoadingSwap isLoading={form.formState.isSubmitting}>
                  Save
                </LoadingSwap>
              </Button>
              <Button
                type='button'
                form='asset-form'
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
  )
}
