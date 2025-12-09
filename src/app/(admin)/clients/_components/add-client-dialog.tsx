'use client'

import React, { useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  insertClientSchema,
  insertClientSchemaType
} from '@/zod-schemas/clients'
import { Button } from '@/components/ui/button'
import {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox
} from '@/components/form/form-base'
import { SelectItem } from '@/components/ui/select'
import { LoadingSwap } from '@/components/shared/loading-swap'
import { useRouter } from 'next/navigation'

import { costCentre } from '@/db/schema'
import { entity_types } from '@/lib/constants'
import { OrganizationSchema } from '@/zod-schemas/organizations'
import { saveClientAction } from '@/server-actions/clients'

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  organization: ReturnType<typeof OrganizationSchema.parse>
  orgCostCentres: costCentre[]
  client?: insertClientSchemaType
}

// -----------------------------------------
// Stable initial empty values
// -----------------------------------------
const initialEmptyClient: Omit<insertClientSchemaType, 'organizationId'> = {
  id: '',
  name: '',
  entity_type: '',
  cost_centre_name: '',
  notes: '',
  active: true
}

export default function AddClientDialog({
  open,
  setOpen,
  organization,
  orgCostCentres,
  client
}: Props) {
  const router = useRouter()

  // -----------------------------------------
  // Stable computed default values
  // -----------------------------------------
  const initialValues = useMemo<insertClientSchemaType>(
    () =>
      client
        ? client
        : {
            ...initialEmptyClient,
            organizationId: organization.id
          },
    [client, organization.id]
  )

  // -----------------------------------------
  // Form setup
  // -----------------------------------------
  const form = useForm<insertClientSchemaType>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: initialValues
  })

  // -----------------------------------------
  // Reset form ONLY when dialog opens
  // (prevents infinite loops)
  // -----------------------------------------
  useEffect(() => {
    if (open) {
      form.reset(initialValues)
    }
  }, [open, initialValues, form])

  // -----------------------------------------
  // Submit Handler
  // -----------------------------------------
  const handleSubmit = async (data: insertClientSchemaType) => {
    try {
      await saveClientAction(data)
      toast.success(`Client ${data.id ? 'updated' : 'added'} successfully`)
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(`Failed to ${data.id ? 'update' : 'add'} client`)
      console.error(err)
    }
  }

  // -----------------------------------------
  // Render
  // -----------------------------------------
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client?.id ? 'Edit Client' : 'New Client'}</DialogTitle>
          <DialogDescription>Create or edit clients here.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
          <FormInput control={form.control} name='name' label='Name' />

          <FormSelect
            control={form.control}
            name='cost_centre_name'
            label='Cost Centre'
          >
            {orgCostCentres.map(cc => (
              <SelectItem key={cc.id} value={cc.name}>
                {cc.name}
              </SelectItem>
            ))}
          </FormSelect>

          <FormSelect
            control={form.control}
            name='entity_type'
            label='Entity Type'
          >
            {entity_types.map(et => (
              <SelectItem key={et.id} value={et.id}>
                {et.description}
              </SelectItem>
            ))}
          </FormSelect>

          <FormTextarea control={form.control} name='notes' label='Notes' />
          <FormCheckbox control={form.control} name='active' label='Active' />

          <Button type='submit'>
            <LoadingSwap isLoading={form.formState.isSubmitting}>
              {client?.id ? 'Update' : 'Create'}
            </LoadingSwap>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
