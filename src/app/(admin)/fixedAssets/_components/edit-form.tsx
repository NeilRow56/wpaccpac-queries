// components/edit-asset-form.tsx
'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { AssetWithCalculations } from '@/lib/asset-calculations'

const assetFormEditSchema = z.object({
  id: z.number().min(1, 'Id is required'),
  name: z.string().min(1, 'Name is required'),
  clientId: z.string().min(1, 'Client is required'),
  description: z.string().optional(),

  cost: z
    .string()
    .min(1, 'Cost is required')
    .refine(
      val => !isNaN(Number(val)) && Number(val) > 0,
      'Cost must be a positive number'
    ),

  dateOfPurchase: z.string().min(1, 'Purchase date is required'),

  adjustment: z
    .string()
    .refine(val => !isNaN(Number(val)), 'Adjustment must be a valid number'),

  depreciationRate: z
    .string()
    .min(1, 'Depreciation rate is required')
    .refine(val => {
      const n = Number(val)
      return !isNaN(n) && n > 0 && n <= 100
    }, 'Rate must be between 0 and 100'),

  totalDepreciationToDate: z
    .string()
    .refine(
      val => !isNaN(Number(val)),
      'Total depreciation must be a valid number'
    ),

  disposalValue: z
    .string()
    .optional()
    .refine(
      val => val === undefined || !isNaN(Number(val)),
      'Disposal value must be a valid number'
    )
})

export type AssetFormEditValues = z.infer<typeof assetFormEditSchema>

interface EditAssetFormProps {
  asset: AssetWithCalculations | null
  open: boolean
  onClose: () => void
  onSubmit: (values: AssetFormEditValues & { id: number }) => void
  clients: Array<{ id: string; name: string }>
}

export function EditAssetForm({
  asset,
  open,
  onClose,
  onSubmit,
  clients
}: EditAssetFormProps) {
  const form = useForm<AssetFormEditValues>({
    resolver: zodResolver(assetFormEditSchema),
    defaultValues: {
      name: '',
      clientId: '',
      description: '',
      cost: '',
      dateOfPurchase: '',
      adjustment: '0',
      depreciationRate: '',
      totalDepreciationToDate: '',
      disposalValue: ''
    }
  })

  React.useEffect(() => {
    if (asset) {
      const formattedDate = new Date(asset.dateOfPurchase)
        .toISOString()
        .split('T')[0]
      form.reset({
        name: asset.name,
        clientId: asset.clientId || '',
        description: asset.description || '',
        cost: asset.cost.toString(),
        dateOfPurchase: formattedDate,
        adjustment: asset.adjustment?.toString() || '0',
        depreciationRate: asset.depreciationRate.toString(),
        totalDepreciationToDate: asset.totalDepreciationToDate.toString(),
        disposalValue: asset.disposalValue?.toString() || ''
      })
    }
  }, [asset, form])

  const handleSubmit = (values: AssetFormEditValues) => {
    if (asset) {
      onSubmit({ ...values, id: asset.id })
      form.reset()
      onClose()
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  if (!asset) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Edit Fixed Asset</DialogTitle>
          <DialogDescription>
            Update the details of the fixed asset. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-6'
          >
            <FormField
              control={form.control}
              name='clientId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a client' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., Laptop, Company Vehicle'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Optional description of the asset'
                      className='resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='cost'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost *</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Original purchase cost</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='adjustment'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustment</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Cost adjustments</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='dateOfPurchase'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Purchase *</FormLabel>
                    <FormControl>
                      <Input type='date' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='depreciationRate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depreciation Rate (%) *</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='20'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Annual rate (0-100)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='totalDepreciationToDate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Depreciation To Date</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Previously recorded</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='disposalValue'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disposal Value</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Expected residual value</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose}>
                Cancel
              </Button>
              <Button type='submit'>Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
