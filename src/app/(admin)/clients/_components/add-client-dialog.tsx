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
  insertClientSchemaType,
  insertClientSchema
} from '@/zod-schemas/clients'
// import { useAction } from 'next-safe-action/hooks'
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
import { businessTypes } from '@/db/schema'

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  organization: Organization
  client?: Client
}

function AddClientDialog({ setOpen, open, client, organization }: Props) {
  const router = useRouter()
  const hasClientId = client?.id

  const emptyValues: insertClientSchemaType = {
    id: '',
    name: '',
    organizationId: organization.id ?? '',
    entity_type: 'Unknown',
    cost_centre_name: '',
    notes: '',
    active: true
  }

  const defaultValues: insertClientSchemaType = hasClientId
    ? {
        id: client?.id ?? '',
        name: client?.name ?? '',
        organizationId: organization.id ?? '',
        entity_type: 'Unknown',
        cost_centre_name: '',
        notes: '',
        active: true
      }
    : emptyValues

  const form = useForm<insertClientSchemaType>({
    resolver: zodResolver(insertClientSchema),
    mode: 'onBlur',
    defaultValues
  })

  const { isSubmitting } = form.formState

  function onSubmit(data: insertClientSchemaType) {
    toast('You submitted the following values:', {
      description: (
        <pre className='bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4'>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
      position: 'bottom-right',
      classNames: {
        content: 'flex flex-col gap-2'
      },
      style: {
        '--border-radius': 'calc(var(--radius)  + 4px)'
      } as React.CSSProperties
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {client?.id ? 'Edit' : 'New'} Client{' '}
            {client?.id ? `#${client.id}` : 'Form'}
          </DialogTitle>

          <DialogDescription>
            Create or edit clients here. Click create/update when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>

        <form
          id='create-client-form'
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-4'
        >
          <FieldGroup>
            <FormInput<insertClientSchemaType>
              control={form.control}
              name='name'
              label='Name'
            />

            {/* <FormSelect control={form.control} name='cost_centre_name' label='Cost Centre'>
              {organization.costCentre?.map(item => (
                <SelectItem key={item.id} value={String(item.cost_centre_name)}>
                  {item.cost_centre_name}
                </SelectItem>
              ))}
            </FormSelect> */}
            <FormSelect
              control={form.control}
              name='entity_type'
              label='Entity Type'
            >
              {businessTypes.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </FormSelect>
            <FormTextarea<insertClientSchemaType>
              control={form.control}
              name='notes'
              label='Notes'
              description='Helpful notes for this period&pos;s accounts.'
            />

            <FieldGroup data-slot='checkbox-group'>
              <FormCheckbox
                control={form.control}
                label='Active'
                name='active'
              />
            </FieldGroup>

            <Field orientation='horizontal' className='justify-start gap-2'>
              <Button
                type='submit'
                form='create-client-form'
                disabled={isSubmitting}
              >
                <LoadingSwap isLoading={isSubmitting}>
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

export default AddClientDialog
