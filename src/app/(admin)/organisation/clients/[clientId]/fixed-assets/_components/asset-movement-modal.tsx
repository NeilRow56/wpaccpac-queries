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

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'

import type { AssetWithPeriodCalculations } from '@/lib/asset-calculations'
import { postAssetMovementAction } from '@/server-actions/asset-movements'
import { useRouter } from 'next/navigation'

const movementTypeUiSchema = z.enum([
  'cost_adj',
  'depreciation_adj',
  'revaluation',
  'disposal' // UI-only
])

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
    { message: 'Percentage must be between 0 and 100' }
  )

const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

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
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatGBPFromString(value?: string) {
  const n = Number(value ?? '0')
  const safe = Number.isFinite(n) ? n : 0
  return safe.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// ✅ helpers for estimates
function n0(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// function formatGBP(value: number) {
//   const safe = Number.isFinite(value) ? value : 0
//   return safe.toLocaleString('en-GB', {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2
//   })
// }

function formatWholeGBP(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(
    Math.round(safe)
  )
}

function uiMovementLabel(t: MovementType): string {
  switch (t) {
    case 'cost_adj':
      return 'Cost adjustment'
    case 'depreciation_adj':
      return 'Depreciation adjustment'
    case 'revaluation':
      return 'Revaluation'
    case 'disposal':
      return 'Disposal'
    default:
      return 'Movement'
  }
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
  const router = useRouter()

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pendingValues, setPendingValues] =
    React.useState<AssetMovementFormValues | null>(null)

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

  React.useEffect(() => {
    if (!open) {
      setConfirmOpen(false)
      setPendingValues(null)
    }
  }, [open])

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
        <span className='text-primary font-bold'>Asset: </span>
        <span className='text-foreground font-bold'>{asset.name}</span>
      </span>
    </>
  )

  function mapUiToDbMovementType(values: AssetMovementFormValues) {
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

    return dbMovementType
  }

  const onSubmit: SubmitHandler<AssetMovementFormValues> = values => {
    if (
      values.postingDate < period.startDate ||
      values.postingDate > period.endDate
    ) {
      toast.error('Posting date must be within the current period')
      return
    }

    setPendingValues(values)
    setConfirmOpen(true)
  }

  const confirmPost = async () => {
    const values = pendingValues
    if (!values) return

    const dbMovementType = mapUiToDbMovementType(values)

    startTransition(async () => {
      try {
        const result = await postAssetMovementAction({
          clientId,
          assetId: asset.id,
          periodId: period.id,
          movementType: dbMovementType,
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

        router.refresh()
        setConfirmOpen(false)
        setPendingValues(null)
        onPosted()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        toast.error(msg)
      }
    })
  }

  function renderMovementFields() {
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
            <span className='text-red-600'>
              100 = full disposal. For partial disposals, enter the percentage
              disposed.
            </span>
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
            <span className='text-red-600'>
              Leave as 0 and let the server compute depreciation on disposal
              from the % disposed and available depreciation.
            </span>
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
            <span className='text-red-600'>
              Leave as 0 and let the server compute disposal cost from the %
              disposed and available cost.
            </span>
          </p>
        </div>
      </div>
    )
  }

  const confirmSummary = pendingValues
    ? (() => {
        const isDisposal = pendingValues.movementType === 'disposal'
        const pct = isDisposal
          ? n0(pendingValues.disposalPercentage ?? '0') / 100
          : 0

        const inputCost = n0(pendingValues.amountCost)
        const inputDep = n0(pendingValues.amountDepreciation ?? '0')

        const costIsAuto = isDisposal && Math.abs(inputCost) < 0.000001
        const depIsAuto = isDisposal && Math.abs(inputDep) < 0.000001

        const availableCost = n0(asset.closingCost)
        const availableDep = n0(asset.openingAccumulatedDepreciation) // ✅ b/fwd basis

        const estCost = availableCost * pct
        const estDep = availableDep * pct

        return {
          movementLabel: uiMovementLabel(pendingValues.movementType),
          postingDate: formatYmdGb(pendingValues.postingDate),

          amountCost: formatGBPFromString(pendingValues.amountCost),
          amountDep: formatGBPFromString(
            pendingValues.amountDepreciation ?? '0'
          ),

          costIsAuto,
          depIsAuto,
          estCost: formatWholeGBP(estCost),
          estDep: formatWholeGBP(estDep),

          proceeds: formatGBPFromString(pendingValues.amountProceeds ?? '0'),
          pctText: isDisposal
            ? String(pendingValues.disposalPercentage ?? '')
            : '',
          note: (pendingValues.note ?? '').trim(),
          isDisposal,
          proceedsIsZero:
            isDisposal && n0(pendingValues.amountProceeds ?? '0') === 0
        }
      })()
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={next => !next && onClose()}>
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

                  form.setValue('movementType', next, {
                    shouldValidate: true,
                    shouldDirty: true
                  })

                  form.clearErrors()

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
                {pending ? 'Posting…' : 'Review & confirm'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ Confirmation dialog */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={next => {
          if (!pending) setConfirmOpen(next)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-600'>
              Confirm posting
            </AlertDialogTitle>
            <AlertDialogDescription className='text-primary'>
              Review the details below before posting this movement.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='space-y-3 text-sm'>
            <div className='rounded-md border p-3'>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Asset</span>
                <span className='font-medium'>{asset.name}</span>
              </div>
              <div className='mt-2 flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Period</span>
                <span className='font-medium'>{period.name}</span>
              </div>
              <div className='mt-2 flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Posting date</span>
                <span className='font-medium'>
                  {confirmSummary?.postingDate ?? '—'}
                </span>
              </div>
              <div className='mt-2 flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Movement</span>
                <span className='font-medium'>
                  {confirmSummary?.movementLabel ?? '—'}
                </span>
              </div>
            </div>

            <div className='rounded-md border p-3'>
              {/* Cost */}
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Cost (£)</span>

                {confirmSummary?.isDisposal && confirmSummary.costIsAuto ? (
                  <div className='text-right'>
                    <div className='font-medium tabular-nums'>
                      Auto-calculated (est. {confirmSummary.estCost})
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      Final value computed on posting
                    </div>
                  </div>
                ) : (
                  <span className='font-medium tabular-nums'>
                    {confirmSummary?.amountCost ?? '—'}
                  </span>
                )}
              </div>

              {/* Depreciation */}
              <div className='mt-2 flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>Depreciation (£)</span>

                {confirmSummary?.isDisposal && confirmSummary.depIsAuto ? (
                  <div className='text-right'>
                    <div className='font-medium tabular-nums'>
                      Auto-calculated (est. {confirmSummary.estDep})
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      Final value computed on posting
                    </div>
                  </div>
                ) : (
                  <span className='font-medium tabular-nums'>
                    {confirmSummary?.amountDep ?? '—'}
                  </span>
                )}
              </div>

              {confirmSummary?.isDisposal && (
                <>
                  <div className='mt-2 flex items-center justify-between gap-4'>
                    <span className='text-muted-foreground'>Proceeds (£)</span>
                    <span className='font-medium tabular-nums'>
                      {confirmSummary.proceeds}
                    </span>
                  </div>

                  <div className='mt-2 flex items-center justify-between gap-4'>
                    <span className='text-muted-foreground'>Disposal %</span>
                    <span className='font-medium tabular-nums'>
                      {confirmSummary.pctText}%
                    </span>
                  </div>

                  {confirmSummary.proceedsIsZero && (
                    <div className='mt-3 rounded-md bg-amber-50 p-2 text-amber-900'>
                      Proceeds are £0.00 — confirm this is correct.
                    </div>
                  )}
                </>
              )}

              {confirmSummary?.note ? (
                <div className='mt-3'>
                  <div className='text-muted-foreground'>Note</div>
                  <div className='bg-muted mt-1 rounded-md p-2'>
                    {confirmSummary.note}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPost} disabled={pending}>
              {pending ? 'Posting…' : 'Confirm & post'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className='text-sm text-red-600'>{msg}</p>
}
