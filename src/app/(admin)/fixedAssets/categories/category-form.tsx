// components/category-form.tsx
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

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  clientId: z.string().min(1, 'Client is required'),
  description: z.string().optional(),
  defaultDepreciationRate: z
    .string()
    .optional()
    .refine(
      val =>
        !val ||
        (!isNaN(parseFloat(val)) &&
          parseFloat(val) > 0 &&
          parseFloat(val) <= 100),
      'Rate must be between 0 and 100'
    )
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface CategoryFormProps {
  category?: {
    id: string
    name: string
    clientId: string
    description?: string | null
    defaultDepreciationRate?: string | null
  } | null
  open: boolean
  onClose: () => void
  onSubmit: (values: CategoryFormValues & { id?: string }) => void
  clients: Array<{ id: string; name: string }>
  mode: 'create' | 'edit'
}

export function CategoryForm({
  category,
  open,
  onClose,
  onSubmit,
  clients,
  mode
}: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      clientId: '',
      description: '',
      defaultDepreciationRate: ''
    }
  })

  React.useEffect(() => {
    if (category && mode === 'edit') {
      form.reset({
        name: category.name,
        clientId: category.clientId,
        description: category.description || '',
        defaultDepreciationRate: category.defaultDepreciationRate || ''
      })
    } else if (mode === 'create') {
      form.reset({
        name: '',
        clientId: '',
        description: '',
        defaultDepreciationRate: ''
      })
    }
  }, [category, mode, form])

  const handleSubmit = (values: CategoryFormValues) => {
    if (mode === 'edit' && category) {
      onSubmit({ ...values, id: category.id })
    } else {
      onSubmit(values)
    }
    form.reset()
    onClose()
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Category' : 'Edit Category'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new asset category. Categories help organize your assets.'
              : 'Update the category details.'}
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={mode === 'edit'}
                  >
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
                  {mode === 'edit' && (
                    <FormDescription>
                      Client cannot be changed after creation
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., Motor Vehicles, Office Equipment'
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
                      placeholder='Optional description of this category'
                      className='resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='defaultDepreciationRate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Depreciation Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='20'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: New assets in this category will use this rate by
                    default
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose}>
                Cancel
              </Button>
              <Button type='submit'>
                {mode === 'create' ? 'Create Category' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
