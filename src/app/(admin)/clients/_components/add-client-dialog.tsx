'use client'

import React, { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Field, FieldGroup } from '@/components/ui/field'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  insertClientSchema,
  insertClientSchemaType
} from '@/zod-schemas/clients'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LoadingSwap } from '@/components/shared/loading-swap'
import { Organization } from '@/db/schema/authSchema'
import {
  FormCheckbox,
  FormInput,
  FormSelect,
  FormTextarea
} from '@/components/form/form-base'
import { Client } from './columns'
import { SelectItem } from '@/components/ui/select'
import { costCentre } from '@/db/schema'
import { entity_types } from '@/lib/constants'

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  organization: Organization
  orgCostCentres: costCentre[]
  client?: Client
}

export default function AddClientDialog({
  setOpen,
  open,
  client,
  organization,
  orgCostCentres
}: Props) {
  const router = useRouter()
  const hasClientId = client?.id

  const emptyValues: insertClientSchemaType = {
    id: '',
    name: '',
    organizationId: organization.id ?? '',
    entity_type: '',
    cost_centre_name: '',
    notes: '',
    active: true
  }

  const defaultValues: insertClientSchemaType = hasClientId
    ? {
        id: client?.id ?? ' ',
        name: client?.name ?? ' ',
        organizationId: organization?.id ?? ' ',
        entity_type: client?.entity_type ?? '',
        cost_centre_name: client?.cost_centre_name ?? '',
        notes: client?.notes ?? ' ',
        active: client?.active ?? true
      }
    : emptyValues

  const form = useForm<insertClientSchemaType>({
    resolver: zodResolver(insertClientSchema),
    mode: 'onBlur',
    defaultValues
  })
  useEffect(() => {
    console.log('FORM ERRORS:', form.formState.errors)
  }, [form.formState.errors])

  async function onSubmit(values: insertClientSchemaType) {
    console.log(values)
  }

  useEffect(() => {
    console.log('FORM ERRORS:', form.formState.errors)
  }, [form.formState.errors])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {client?.id ? 'Edit' : 'New'} Client{' '}
            {client?.id ? `#${client.id}` : ''}
          </DialogTitle>
          <DialogDescription>
            Create or edit clients. Click create/update when done.
          </DialogDescription>
        </DialogHeader>

        <form
          id='create-client-form'
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-4'
        >
          <FieldGroup>
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
              {entity_types.map(bt => (
                <SelectItem key={bt.id} value={bt.description}>
                  {bt.description}
                </SelectItem>
              ))}
            </FormSelect>

            <FormTextarea
              control={form.control}
              name='notes'
              label='Notes'
              description='Helpful notes.'
            />

            <FieldGroup data-slot='checkbox-group'>
              <FormCheckbox
                control={form.control}
                label='Active'
                name='active'
              />
            </FieldGroup>

            <Field orientation='horizontal' className='justify-start gap-2'>
              <Button type='submit' disabled={form.formState.isSubmitting}>
                <LoadingSwap isLoading={form.formState.isSubmitting}>
                  {client?.id ? 'Update' : 'Create'}
                </LoadingSwap>
              </Button>

              <Button
                type='button'
                variant='outline'
                onClick={() => form.reset(defaultValues)}
              >
                Reset
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
