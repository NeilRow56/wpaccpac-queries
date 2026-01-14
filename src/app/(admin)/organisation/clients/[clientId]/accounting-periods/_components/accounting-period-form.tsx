'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Form, FormField } from '@/components/ui/form'
import type { SubmitHandler, UseFormReturn } from 'react-hook-form'
import {
  //   FormSelect,
  FormInputDate,
  FormCheckbox
} from '@/components/form/form-base'
import { LoadingSwap } from '@/components/shared/loading-swap'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError
} from '@/components/ui/field'
// import { SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

import { accountingPeriodFormSchema } from '@/zod-schemas/accountingPeriod'
type FormValues = z.infer<typeof accountingPeriodFormSchema>

type BaseProps = {
  open: boolean
  onClose: () => void
  //   clients: Array<{ id: string; name: string }>
  clientId: string
}

type CreateProps = BaseProps & {
  mode: 'create'
  onSubmit: (values: FormValues) => void
}

type PeriodStatus = 'PLANNED' | 'OPEN' | 'CLOSING' | 'CLOSED'

type EditProps = BaseProps & {
  mode: 'edit'
  accountingPeriods: (FormValues & { id: string; status?: PeriodStatus }) | null
  onSubmit: (values: FormValues & { id: string }) => void
}

export type AccountingPeriodProps = CreateProps | EditProps

export function AccountingPeriodForm(props: AccountingPeriodProps) {
  const { open, onClose, clientId } = props
  const form = useForm({
    resolver: zodResolver(accountingPeriodFormSchema),
    defaultValues: {
      clientId,
      periodName: '',
      startDate: '',
      endDate: '',
      isCurrent: false as boolean // Explicit type,
    }
  }) as UseFormReturn<{
    clientId: string
    periodName: string
    startDate: string
    endDate: string
    isCurrent: boolean
  }>

  React.useEffect(() => {
    if (props.mode === 'edit' && props.accountingPeriods) {
      // This now checks for null
      const formattedEndDate = new Date(props.accountingPeriods.endDate)
        .toISOString()
        .split('T')[0]
      const formattedStartDate = new Date(props.accountingPeriods.startDate)
        .toISOString()
        .split('T')[0]
      form.reset({
        clientId: props.accountingPeriods.clientId,
        periodName: props.accountingPeriods.periodName,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        isCurrent: props.accountingPeriods.isCurrent ?? false
      })
    } else if (props.mode === 'create') {
      form.reset({
        clientId,
        periodName: '',
        startDate: '',
        endDate: '',
        isCurrent: false
      })
    }
  }, [props, form, clientId])

  const handleSubmit: SubmitHandler<FormValues> = values => {
    const formData: FormValues = {
      ...values,
      clientId
    }

    if (props.mode === 'edit') {
      const selected = props.accountingPeriods
      if (!selected) return

      const payload: FormValues & { id: string } = {
        ...formData,
        id: selected.id
      }

      props.onSubmit(payload)
    } else {
      props.onSubmit(formData)
    }

    form.reset()
    onClose()
  }

  // Auto-generate period name based on dates
  // eslint-disable-next-line react-hooks/incompatible-library
  const startDate = form.watch('startDate')
  const endDate = form.watch('endDate')

  React.useEffect(() => {
    if (startDate && endDate && props.mode === 'create') {
      const start = new Date(startDate)
      const end = new Date(endDate)

      const startMonth = start.toLocaleString('en-GB', {
        month: 'short',
        year: 'numeric'
      })
      const endMonth = end.toLocaleString('en-GB', {
        month: 'short',
        year: 'numeric'
      })

      if (startMonth === endMonth) {
        form.setValue('periodName', startMonth)
      } else {
        form.setValue('periodName', `${startMonth} - ${endMonth}`)
      }
    }
  }, [startDate, endDate, form, props.mode])

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className='max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {props.mode === 'create'
              ? 'Create New Accounting Period'
              : 'Edit Accounting Period'}
          </DialogTitle>
          <DialogDescription>
            {props.mode === 'create'
              ? 'Create a new accounting period for your client.'
              : 'Update the accounting period details.'}
          </DialogDescription>
        </DialogHeader>
        <Card className='mx-auto w-full max-w-5xl'>
          <CardHeader className='text-center'>
            <CardTitle></CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                id='accounting-periods-form'
                onSubmit={form.handleSubmit(handleSubmit)}
                className='space-y-6'
              >
                <FieldGroup>
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8'>
                    <div className='text-primary min-w-0 space-y-4 font-medium'>
                      {props.mode === 'edit' && (
                        <FieldDescription>
                          Client cannot be changed after creation
                        </FieldDescription>
                      )}
                      <FormInputDate<FormValues>
                        control={form.control}
                        name='startDate'
                        label='Start date'
                      />
                      <FormInputDate<FormValues>
                        control={form.control}
                        name='endDate'
                        label='End date'
                      />

                      <Field>
                        <FieldLabel htmlFor='periodName'>
                          Period Name *
                        </FieldLabel>
                        <FormField
                          control={form.control}
                          name='periodName'
                          render={({ field, fieldState }) => (
                            <>
                              <Input
                                id='periodName'
                                placeholder='e.g., Jan 2024, Q1 2024'
                                {...field}
                              />
                              {fieldState.error && (
                                <FieldError>
                                  {fieldState.error.message}
                                </FieldError>
                              )}
                            </>
                          )}
                        />
                        <FieldDescription>
                          Auto-generated based on dates, but you can customize
                          it
                        </FieldDescription>
                      </Field>
                      <FormCheckbox
                        control={form.control}
                        name='isCurrent'
                        label='Current accounting period'
                      />
                      <div className='space-y-1 leading-none'>
                        <FieldLabel
                          htmlFor='isCurrent'
                          className='cursor-pointer font-normal'
                        >
                          Set as current period
                        </FieldLabel>
                        <FieldDescription>
                          Only one period can be current at a time. This will be
                          the default period for calculations.
                        </FieldDescription>
                      </div>
                      {/* Add isOpen Checkbox - Only show in edit mode */}
                      {props.mode === 'edit' && (
                        <>
                          {/* <FormCheckbox
                            control={form.control}
                            name='isOpen'
                            label='Period is open'
                          /> */}
                          <div className='space-y-1 leading-none'>
                            <FieldLabel
                              htmlFor='isOpen'
                              className='cursor-pointer font-normal'
                            >
                              Period status
                            </FieldLabel>
                            <FieldDescription>
                              Uncheck to close this period. Closed periods
                              should not be edited or deleted.
                            </FieldDescription>
                          </div>
                        </>
                      )}
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
                form='accounting-periods-form'
                className='w-full max-w-[150px] dark:bg-blue-600 dark:text-white'
                disabled={form.formState.isSubmitting}
              >
                <LoadingSwap isLoading={form.formState.isSubmitting}>
                  Save
                </LoadingSwap>
              </Button>
              <Button
                type='button'
                form='accounting-periods-form'
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
