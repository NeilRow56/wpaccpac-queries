// 'use client'

// import * as React from 'react'
// import { zodResolver } from '@hookform/resolvers/zod'

// import { AssetWithCalculations } from '@/lib/asset-calculations'
// import {
//   FormInput,
//   FormSelect,
//   FormTextarea,
//   FormInputDate,
//   FormInputNumberString
// } from '@/components/form/form-base'

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription
// } from '@/components/ui/dialog'

// import { Button } from '@/components/ui/button'
// import { assetFormSchema, AssetFormValues } from '@/zod-schemas/fixedAssets'
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle
// } from '@/components/ui/card'
// import { Field, FieldGroup } from '@/components/ui/field'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue
// } from '@/components/ui/select'
// import { LoadingSwap } from '@/components/shared/loading-swap'
// import {
//   Form,
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage
// } from '@/components/ui/form'
// import { useForm } from 'react-hook-form'
// // import { depreciation_methods } from '@/lib/constants'
// import Link from 'next/link'
// import { assetToFormValues } from '@/lib/asset-form-values'

// type BaseProps = {
//   open: boolean
//   onClose: () => void
//   // clients: Array<{ id: string; name: string }>
//   clientId: string
//   categories: Array<{ id: string; name: string; clientId: string }>
// }

// type CreateProps = BaseProps & {
//   mode: 'create'
//   onSubmit: (values: AssetFormValues) => void
// }

// type EditProps = BaseProps & {
//   mode: 'edit'
//   asset: AssetWithCalculations
//   onSubmit: (values: AssetFormValues & { id: string }) => void
// }

// export type AssetFormProps = CreateProps | EditProps

// export function AssetForm(props: AssetFormProps) {
//   const { open, onClose, clientId, categories, mode } = props
//   const asset = mode === 'edit' ? props.asset : null
//   const form = useForm<AssetFormValues>({
//     resolver: zodResolver(assetFormSchema),
//     defaultValues: {
//       name: '',
//       clientId,
//       categoryId: '',
//       description: '',
//       originalCost: '',
//       costAdjustment: '0',
//       acquisitionDate: '',
//       depreciationMethod: 'reducing_balance',
//       depreciationRate: ''
//     }
//   })

//   const selectedClientId = form.watch('clientId')
//   const filteredCategories = categories.filter(
//     cat => cat.clientId === selectedClientId
//   )

//   React.useEffect(() => {
//     if (!asset) return

//     form.reset(assetToFormValues(asset))
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [asset])

//   const handleSubmit = (values: AssetFormValues) => {
//     if (props.mode === 'edit') {
//       // TypeScript KNOWS this is EditProps here
//       if (!props.asset) return

//       props.onSubmit({
//         ...values,
//         id: props.asset.id
//       })
//     } else {
//       // TypeScript KNOWS this is CreateProps here
//       props.onSubmit(values)
//     }

//     form.reset()
//     onClose()
//   }

//   return (
//     <Dialog open={open} onOpenChange={onClose}>
//       <DialogContent className='max-h-[90vh] min-w-4xl overflow-y-auto'>
//         <DialogHeader>
//           <DialogTitle className='text-primary'>
//             {props.mode === 'edit' ? 'Edit Fixed Asset' : 'Create Fixed Asset'}
//           </DialogTitle>
//           <DialogDescription>
//             {props.mode === 'edit'
//               ? 'Update the details of this asset.'
//               : 'Add a new fixed asset to the register.'}
//           </DialogDescription>
//         </DialogHeader>

//         <Card className='mx-auto w-full'>
//           <CardHeader className='text-center'>
//             <CardTitle></CardTitle>
//             <CardDescription></CardDescription>
//           </CardHeader>

//           <CardContent>
//             <Form {...form}>
//               <form id='asset-form' onSubmit={form.handleSubmit(handleSubmit)}>
//                 <FieldGroup>
//                   <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8'>
//                     <div className='text-primary min-w-0 space-y-4 font-bold'>
//                       <FormSelect
//                         control={form.control}
//                         name='categoryId'
//                         label='Category'
//                         className='font-normal text-gray-900'
//                       >
//                         {filteredCategories.map(category => (
//                           <SelectItem key={category.id} value={category.id}>
//                             {category.name}
//                           </SelectItem>
//                         ))}
//                       </FormSelect>
//                       <Button asChild size='sm'>
//                         <Link
//                           href={`/organisation/clients/${clientId}/asset-categories`}
//                         >
//                           <span className='text-sm text-white'>
//                             Add asset category
//                           </span>
//                         </Link>
//                       </Button>
//                       <FormInput<AssetFormValues>
//                         control={form.control}
//                         name='name'
//                         className='font-normal text-gray-900'
//                         label='Asset Name'
//                       />
//                       <FormDescription className='text-muted-foreground font-light'>
//                         Name (add serial or registration number if availabe)
//                       </FormDescription>
//                       <FormTextarea
//                         className='min-h-24 font-normal text-gray-900'
//                         control={form.control}
//                         name='description'
//                         label='Description'
//                       />
//                       <FormDescription className='text-muted-foreground font-light'>
//                         Add a detailed description
//                       </FormDescription>
//                       <FormInputNumberString<AssetFormValues>
//                         control={form.control}
//                         name='originalCost'
//                         label='Cost'
//                         className='font-normal text-gray-900'
//                       />
//                       <FormInputNumberString<AssetFormValues>
//                         control={form.control}
//                         name='costAdjustment'
//                         label='Cost adjustment'
//                         className='font-normal text-gray-900'
//                       />
//                       <FormDescription className='text-muted-foreground font-light'>
//                         Capitalised improvements or revaluation (added to cost)
//                       </FormDescription>
//                     </div>
//                     <div className='text-primary min-w-0 space-y-4 font-bold'>
//                       <FormInputDate<AssetFormValues>
//                         control={form.control}
//                         className='font-normal text-gray-900'
//                         name='acquisitionDate'
//                         label='Date of acquiition'
//                       />
//                       <FormField
//                         control={form.control}
//                         name='depreciationMethod'
//                         render={({ field }) => (
//                           <FormItem>
//                             <FormLabel>Depreciation Method *</FormLabel>
//                             <Select
//                               onValueChange={field.onChange}
//                               value={field.value}
//                             >
//                               <FormControl>
//                                 <SelectTrigger>
//                                   <SelectValue placeholder='Select method' />
//                                 </SelectTrigger>
//                               </FormControl>
//                               <SelectContent>
//                                 <SelectItem value='straight_line'>
//                                   Straight Line
//                                 </SelectItem>
//                                 <SelectItem value='reducing_balance'>
//                                   Reducing Balance
//                                 </SelectItem>
//                               </SelectContent>
//                             </Select>
//                             <FormDescription>
//                               Straight line: Equal depreciation each year
//                               <br />
//                               Reducing balance: Higher depreciation in early
//                               years
//                             </FormDescription>
//                             <FormMessage />
//                           </FormItem>
//                         )}
//                       />

//                       <FormInputNumberString<AssetFormValues>
//                         control={form.control}
//                         name='depreciationRate'
//                         label='Depreciation Rate (%)'
//                         className='font-normal text-gray-900'
//                       />
//                       <FormDescription className='text-muted-foreground font-light'>
//                         Annual rate (0-100)
//                       </FormDescription>
//                     </div>
//                   </div>
//                 </FieldGroup>
//               </form>
//             </Form>
//           </CardContent>

//           <CardFooter>
//             <Field orientation='horizontal' className='justify-between'>
//               <Button
//                 type='submit'
//                 form='asset-form'
//                 className='w-full max-w-[150px] dark:bg-blue-600 dark:text-white'
//                 disabled={form.formState.isSubmitting}
//               >
//                 <LoadingSwap isLoading={form.formState.isSubmitting}>
//                   Save
//                 </LoadingSwap>
//               </Button>
//               <Button
//                 type='button'
//                 form='asset-form'
//                 variant='outline'
//                 onClick={() => form.reset()}
//               >
//                 Reset
//               </Button>
//             </Field>
//           </CardFooter>
//         </Card>
//       </DialogContent>
//     </Dialog>
//   )
// }
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

type BaseProps = {
  open: boolean
  onClose: () => void
  clientId: string
  categories: Array<{ id: string; name: string; clientId: string }>
}

type CreateProps = BaseProps & {
  mode: 'create'
  onSubmit: (values: AssetFormValues) => void | Promise<void>
}

type EditProps = BaseProps & {
  mode: 'edit'
  asset: AssetWithCalculations
  onSubmit: (values: AssetFormValues & { id: string }) => void | Promise<void>
}

export type AssetFormProps = CreateProps | EditProps

export function AssetForm(props: AssetFormProps) {
  const { open, onClose, clientId, categories, mode } = props
  const asset = mode === 'edit' ? props.asset : null

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: '',
      clientId,
      categoryId: '',
      description: '',
      originalCost: '',
      costAdjustment: '0',
      acquisitionDate: '',
      depreciationMethod: 'reducing_balance',
      depreciationRate: ''
    }
  })

  // Categories are per-client; if you ever enable cross-client selection, this stays safe.
  const selectedClientId = form.watch('clientId')
  const filteredCategories = categories.filter(
    cat => cat.clientId === selectedClientId
  )

  React.useEffect(() => {
    if (!asset) return
    form.reset(assetToFormValues(asset))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset])

  const handleSubmit = async (values: AssetFormValues) => {
    if (props.mode === 'edit') {
      await props.onSubmit({ ...values, id: props.asset.id })
    } else {
      await props.onSubmit(values)
    }

    form.reset({
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
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        // only close when user dismisses the modal
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
                />
                <FormDescription className='text-muted-foreground font-light'>
                  Add a serial / registration number if available.
                </FormDescription>

                <FormTextarea
                  className='min-h-24 font-normal text-gray-900'
                  control={form.control}
                  name='description'
                  label='Description'
                />
                <FormDescription className='text-muted-foreground font-light'>
                  Add a detailed description.
                </FormDescription>

                <FormInputDate<AssetFormValues>
                  control={form.control}
                  className='font-normal text-gray-900'
                  name='acquisitionDate'
                  label='Date of acquisition'
                />

                <FormInputNumberString<AssetFormValues>
                  control={form.control}
                  name='originalCost'
                  label='Original cost'
                  className='font-normal text-gray-900'
                />

                <FormInputNumberString<AssetFormValues>
                  control={form.control}
                  name='costAdjustment'
                  label='Cost adjustment'
                  className='font-normal text-gray-900'
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
