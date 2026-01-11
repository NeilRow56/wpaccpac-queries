'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import type { AssetWithPeriodCalculations } from '@/lib/asset-calculations'
import { postAssetMovementAction } from '@/server-actions/asset-movements'

const movementTypeUiSchema = z.enum([
  'cost_adj',
  'depreciation_adj',
  'revaluation',
  'disposal' // UI-only
])

// Money typed as string in the form; convert in server action or in submit handler.
const moneyString = z
  .string()
  .trim()
  .transform(v => (v === '' ? '0' : v))
  .refine(v => !Number.isNaN(Number(v)), 'Must be a number')

const percentageString = z
  .string()
  .trim()
  .optional()
  .refine(
    v =>
      v == null ||
      v === '' ||
      (!Number.isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 100),
    {
      message: 'Percentage must be between 0 and 100'
    }
  )

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// Core form schema
const assetMovementFormSchema = z
  .object({
    movementType: movementTypeUiSchema,
    postingDate: ymdSchema,
    amountCost: moneyString,
    amountDepreciation: moneyString.optional(),
    amountProceeds: moneyString.optional(),
    disposalPercentage: percentageString.optional(),
    note: z.string().trim().max(500).optional()
  })
  .superRefine((d, ctx) => {
    if (d.movementType === 'depreciation_adj') {
      if (!d.amountDepreciation || d.amountDepreciation.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['amountDepreciation'],
          message: 'Amount is required'
        })
      }
    }

    if (d.movementType === 'disposal') {
      if (!d.disposalPercentage || d.disposalPercentage.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['disposalPercentage'],
          message: 'Disposal percentage is required'
        })
      }
    }
  })

type AssetMovementFormValues = z.input<typeof assetMovementFormSchema>

type MovementType = AssetMovementFormValues['movementType']

const resolver: Resolver<AssetMovementFormValues> = zodResolver(
  assetMovementFormSchema
)

function formatYmdGb(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  // Use UTC to avoid timezone shifting the day
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function AssetMovementModal(props: {
  open: boolean
  asset: AssetWithPeriodCalculations
  clientId: string
  period: {
    id: string
    name: string
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
  }
  onClose: () => void
  onPosted: () => void
}) {
  const { open, asset, clientId, period, onClose, onPosted } = props
  const [pending, startTransition] = useTransition()

  // Default posting date: period end date (common accounting UX)
  const form = useForm<AssetMovementFormValues>({
    resolver,
    defaultValues: {
      movementType: 'disposal',
      postingDate: period.endDate,
      amountCost: '0',
      amountDepreciation: '0',
      amountProceeds: '0',
      disposalPercentage: '100',
      note: ''
    }
  })

  const movementType =
    useWatch({ control: form.control, name: 'movementType' }) ?? 'disposal'

  // Ensure posting date stays within period range (date-only string compare works for YYYY-MM-DD)
  const postingDate =
    useWatch({ control: form.control, name: 'postingDate' }) ?? period.endDate

  React.useEffect(() => {
    if (!postingDate) return
    if (postingDate < period.startDate) {
      form.setValue('postingDate', period.startDate, { shouldValidate: true })
    } else if (postingDate > period.endDate) {
      form.setValue('postingDate', period.endDate, { shouldValidate: true })
    }
  }, [postingDate, period.startDate, period.endDate, form])

  const title = (() => {
    switch (movementType) {
      case 'cost_adj':
        return 'Post cost adjustment'
      case 'depreciation_adj':
        return 'Post depreciation adjustment'
      case 'revaluation':
        return 'Post revaluation'
      case 'disposal':
        return 'Post disposal'
      default:
        return 'Post asset movement'
    }
  })()

  const description = (
    <>
      Posting to <strong>{period.name}</strong>{' '}
      <span className='text-muted-foreground mt-2 block text-sm'>
        Asset: <span className='text-foreground font-medium'>{asset.name}</span>
      </span>
    </>
  )

  const onSubmit: SubmitHandler<AssetMovementFormValues> = values => {
    // Map UI -> DB enum (now that DB enum is cost_adj without dot)
    let dbMovementType:
      | 'cost_adj'
      | 'depreciation_adj'
      | 'revaluation'
      | 'disposal_full'
      | 'disposal_partial'

    if (values.movementType === 'disposal') {
      const pct = Number(values.disposalPercentage || 0)
      dbMovementType = pct >= 100 ? 'disposal_full' : 'disposal_partial'
    } else {
      dbMovementType = values.movementType
    }

    startTransition(async () => {
      try {
        if (
          values.postingDate < period.startDate ||
          values.postingDate > period.endDate
        ) {
          toast.error('Posting date must be within the current period')
          return
        }

        const result = await postAssetMovementAction({
          clientId,
          assetId: asset.id,
          periodId: period.id,
          movementType: dbMovementType, // ✅
          postingDate: values.postingDate,
          amountCost: values.amountCost,
          amountDepreciation: values.amountDepreciation ?? '0',
          amountProceeds: values.amountProceeds ?? '0',
          disposalPercentage: values.disposalPercentage ?? undefined,
          note: values.note ?? null
        })

        if (!result.success) {
          toast.error(result.error || 'Failed to post movement')
          return
        }

        onPosted()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        toast.error(msg)
      }
    })
  }

  function renderMovementFields() {
    // shared field: posting date
    const postingDateField = (
      <div className='space-y-1'>
        <Label htmlFor='postingDate'>Posting date</Label>
        <Input
          id='postingDate'
          type='date'
          min={period.startDate}
          max={period.endDate}
          disabled={pending}
          {...form.register('postingDate')}
        />
        <p className='text-muted-foreground text-xs'>
          Must be within {formatYmdGb(period.startDate)} to{' '}
          {formatYmdGb(period.endDate)}.
        </p>
      </div>
    )

    if (movementType === 'cost_adj') {
      return (
        <div className='space-y-4'>
          {postingDateField}

          <div className='space-y-1'>
            <Label htmlFor='amountCost'>Cost adjustment (£)</Label>
            <Input
              id='amountCost'
              inputMode='decimal'
              placeholder='e.g. 250.00 or -100.00'
              disabled={pending}
              {...form.register('amountCost')}
            />
            <p className='text-muted-foreground text-xs'>
              Use negative values to reduce cost.
            </p>
            <FieldError msg={form.formState.errors.amountCost?.message} />
          </div>
        </div>
      )
    }

    if (movementType === 'depreciation_adj') {
      return (
        <div className='space-y-4'>
          {postingDateField}

          <div className='space-y-1'>
            <Label htmlFor='amountDepreciation'>
              Depreciation adjustment (£)
            </Label>
            <Input
              id='amountDepreciation'
              inputMode='decimal'
              placeholder='e.g. 50.00 or -25.00'
              disabled={pending}
              {...form.register('amountDepreciation')}
            />
            <p className='text-muted-foreground text-xs'>
              Use negative values to reduce accumulated depreciation.
            </p>
            <FieldError
              msg={form.formState.errors.amountDepreciation?.message}
            />
          </div>
        </div>
      )
    }

    if (movementType === 'revaluation') {
      return (
        <div className='space-y-4'>
          {postingDateField}

          <div className='space-y-1'>
            <Label htmlFor='amountCost'>Revaluation – cost change (£)</Label>
            <Input
              id='amountCost'
              inputMode='decimal'
              placeholder='e.g. 1000.00 or -500.00'
              disabled={pending}
              {...form.register('amountCost')}
            />
            <FieldError msg={form.formState.errors.amountCost?.message} />
          </div>

          <div className='space-y-1'>
            <Label htmlFor='amountDepreciation'>
              Revaluation – depreciation adjustment (£) (optional)
            </Label>
            <Input
              id='amountDepreciation'
              inputMode='decimal'
              placeholder='e.g. 200.00 or -100.00'
              disabled={pending}
              {...form.register('amountDepreciation')}
            />
            <p className='text-muted-foreground text-xs'>
              Optional. Use if you need to adjust accumulated depreciation as
              part of the revaluation.
            </p>
            <FieldError
              msg={form.formState.errors.amountDepreciation?.message}
            />
          </div>
        </div>
      )
    }

    // disposal
    return (
      <div className='space-y-4'>
        {postingDateField}

        <div className='space-y-1'>
          <Label htmlFor='disposalPercentage'>Disposal percentage (%)</Label>
          <Input
            id='disposalPercentage'
            inputMode='decimal'
            placeholder='e.g. 100 for full, 25 for partial'
            disabled={pending}
            {...form.register('disposalPercentage')}
          />
          <p className='text-muted-foreground text-xs'>
            100 = full disposal. For partial disposals, enter the percentage
            disposed.
          </p>
          <FieldError msg={form.formState.errors.disposalPercentage?.message} />
        </div>

        <div className='space-y-1'>
          <Label htmlFor='amountProceeds'>Proceeds (£) (optional)</Label>
          <Input
            id='amountProceeds'
            inputMode='decimal'
            placeholder='e.g. 500.00'
            disabled={pending}
            {...form.register('amountProceeds')}
          />
        </div>

        <div className='space-y-1'>
          <Label htmlFor='amountDepreciation'>
            Depreciation on disposal (£) (optional)
          </Label>
          <Input
            id='amountDepreciation'
            inputMode='decimal'
            placeholder='e.g. 300.00'
            disabled={pending}
            {...form.register('amountDepreciation')}
          />
          <p className='text-muted-foreground text-xs'>
            If provided, this posts to “Depreciation on disposals” for the
            period.
          </p>
        </div>

        <div className='space-y-1'>
          <Label htmlFor='amountCost'>Disposal at cost (£) (optional)</Label>
          <Input
            id='amountCost'
            inputMode='decimal'
            placeholder='Leave as 0 to auto-calculate in server action (recommended)'
            disabled={pending}
            {...form.register('amountCost')}
          />
          <p className='text-muted-foreground text-xs'>
            v1 suggestion: leave 0 and let the server compute disposal cost from
            the disposal % and opening cost.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className='sm:max-w-[560px]'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className='space-y-4' onSubmit={form.handleSubmit(onSubmit)}>
          <div className='space-y-2'>
            <Label>Movement type</Label>
            <Select
              value={movementType}
              onValueChange={v => {
                const next = v as MovementType

                // 1) update type
                form.setValue('movementType', next, {
                  shouldValidate: true,
                  shouldDirty: true
                })

                // 2) clear stale errors from other movement types
                form.clearErrors()

                // 3) optional: reset irrelevant fields so they don’t carry over
                if (next !== 'disposal') {
                  form.setValue('disposalPercentage', '100', {
                    shouldValidate: false
                  })
                  form.setValue('amountProceeds', '0', {
                    shouldValidate: false
                  })
                }

                if (next !== 'depreciation_adj') {
                  form.setValue('amountDepreciation', '0', {
                    shouldValidate: false
                  })
                }

                if (next === 'depreciation_adj') {
                  // depreciation adj doesn’t care about cost
                  form.setValue('amountCost', '0', { shouldValidate: false })
                }
              }}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a movement type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='cost_adj'>Cost adjustment</SelectItem>
                <SelectItem value='depreciation_adj'>
                  Depreciation adjustment
                </SelectItem>
                <SelectItem value='revaluation'>Revaluation</SelectItem>
                <SelectItem value='disposal'>
                  Disposal (full/partial)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderMovementFields()}

          <div className='space-y-1'>
            <Label htmlFor='note'>Note (optional)</Label>
            <Textarea
              id='note'
              rows={3}
              placeholder='Add a short explanation for the audit trail'
              disabled={pending}
              {...form.register('note')}
            />
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={pending}>
              {pending ? 'Posting…' : 'Post movement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className='text-sm text-red-600'>{msg}</p>
}
