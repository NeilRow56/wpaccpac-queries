'use client'

import React, { useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
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
import { Field, FieldGroup } from '@/components/ui/field'

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  organization: ReturnType<typeof OrganizationSchema.parse>
  orgCostCentres: costCentre[]
  client?: insertClientSchemaType
}

// -----------------------------------------
// Empty client template
// -----------------------------------------
const initialEmptyClient: Omit<insertClientSchemaType, 'organizationId'> = {
  id: '',
  name: '',
  entity_type: '',
  costCentreId: '',
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
  // Initial values (for edit or new client)
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
  // Reset form ONLY when dialog opens or client changes
  // -----------------------------------------
  useEffect(() => {
    if (open) {
      form.reset(initialValues)
    }
  }, [open, initialValues, form])

  // -----------------------------------------
  // Submit handler
  // -----------------------------------------
  const handleSubmit = async (data: insertClientSchemaType) => {
    try {
      await saveClientAction(data)
      toast.success(`Client ${data.id ? 'updated' : 'added'} successfully`)
      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(`Failed to ${data.id ? 'update' : 'add'} client`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {client?.id ? 'Edit' : 'New'} Client{' '}
            {client?.id ? `#${client.name}` : 'Form'}
          </DialogTitle>
          <DialogDescription>
            Create or edit clients here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        <Card className='mx-auto w-full sm:max-w-md'>
          <CardHeader className='text-center'>
            <CardTitle></CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>

          <CardContent>
            <form id='client-form' onSubmit={form.handleSubmit(handleSubmit)}>
              <FieldGroup>
                <FormInput<insertClientSchemaType>
                  control={form.control}
                  name='name'
                  label='Name'
                />

                {/* Cost Centre dropdown: display DB value as-is for correct selection */}
                <FormSelect
                  control={form.control}
                  name='costCentreId'
                  label='Cost Centre'
                >
                  {orgCostCentres.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
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

                <FormTextarea
                  control={form.control}
                  name='notes'
                  label='Notes'
                />
                <FormCheckbox
                  control={form.control}
                  name='active'
                  label='Active'
                />
              </FieldGroup>
            </form>
          </CardContent>

          <CardFooter>
            <Field orientation='horizontal' className='justify-between'>
              <Button
                type='submit'
                form='client-form'
                className='w-full max-w-[150px] dark:bg-blue-600 dark:text-white'
                disabled={form.formState.isSubmitting}
              >
                <LoadingSwap isLoading={form.formState.isSubmitting}>
                  Save
                </LoadingSwap>
              </Button>
              <Button
                type='button'
                form='client-form'
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
