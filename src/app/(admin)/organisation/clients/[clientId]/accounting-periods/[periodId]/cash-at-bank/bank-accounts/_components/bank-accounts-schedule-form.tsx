'use client'

import * as React from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Info, Plus, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'

import type { LineItemScheduleDocV1 } from '@/lib/schedules/lineItemScheduleTypes'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import { saveCashAtBankAccountsScheduleAction } from '@/server-actions/schedules/cash-at-bank-accounts'

type Props = {
  clientId: string
  periodId: string
  initial: LineItemScheduleDocV1
  prior?: LineItemScheduleDocV1 | null
  priorPeriodLabel?: string
}

function isNegativeAmount(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v < 0
}

function formatNumberWithBrackets(v: number): string {
  const abs = Math.abs(v)
  const s = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(
    abs
  )
  return v < 0 ? `(${s})` : s
}

export default function BankAccountsScheduleForm({
  clientId,
  periodId,
  initial,
  prior,
  priorPeriodLabel
}: Props) {
  const form = useForm<LineItemScheduleDocV1>({ defaultValues: initial })
  useUnsavedChangesWarning(form.formState.isDirty)

  const { control, register, handleSubmit, reset, watch } = form

  const initialSig = React.useMemo(() => JSON.stringify(initial), [initial])
  React.useEffect(() => {
    reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rows',
    keyName: 'fieldId'
  })

  /**
   * Prior column behaviour:
   * - show PRIOR PERIOD "current" (last year's current) in the prior column
   * - show prior description as notes
   */
  const priorById = React.useMemo(() => {
    const map = new Map<
      string,
      { amount: number | null; description: string } | null
    >()

    prior?.rows.forEach(r =>
      map.set(r.id, {
        amount: r.current ?? null,
        description: typeof r.description === 'string' ? r.description : ''
      })
    )

    return map
  }, [prior])

  async function onSubmit(values: LineItemScheduleDocV1) {
    const res = await saveCashAtBankAccountsScheduleAction({
      clientId,
      periodId,
      doc: values
    })

    if (res.success) {
      toast.success('Bank accounts saved')
      form.reset(values)
    } else {
      toast.error(res.message ?? 'Failed to save bank accounts')
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='space-y-4 rounded-lg border p-4'
    >
      {/* Header row */}
      <div className='grid grid-cols-13 items-end gap-3 text-sm'>
        <div className='col-span-4 font-medium'>Account</div>
        <div className='col-span-4 font-medium'>Description</div>

        <div className='col-span-2 grid justify-items-center'>
          <span className='text-muted-foreground'>Current year</span>
          <span className='text-muted-foreground text-[11px] leading-none'>
            £
          </span>
        </div>

        <div className='bg-muted/40 col-span-2 grid justify-items-center rounded-md px-2 py-1'>
          <span className='text-red-600'>
            {priorPeriodLabel ?? 'Prior year'}
          </span>
          <span className='text-muted-foreground text-[11px] leading-none'>
            £
          </span>
        </div>

        {/* Actions column (blank header) */}
        <div className='col-span-1' />
      </div>

      {/* Rows */}
      <div className='space-y-2'>
        {fields.map((row, idx) => {
          const priorRow = priorById.get(row.id) ?? null
          const priorAmount = priorRow?.amount ?? null
          const priorDescription = (priorRow?.description ?? '').trim()
          const hasPriorDescription = priorDescription.length > 0

          const currentField = `rows.${idx}.current` as const
          const currentValue = watch(currentField)
          const currentIsNeg = isNegativeAmount(currentValue)
          const priorIsNeg = isNegativeAmount(priorAmount)

          return (
            <div
              key={row.id}
              className='grid grid-cols-13 items-start gap-3 rounded-md px-2 py-1'
            >
              {/* Account */}
              <div className='col-span-4'>
                <Input
                  placeholder='e.g. Barclays current a/c 1234'
                  className='border-muted-foreground/30 focus-visible:ring-primary/30 bg-white shadow-sm focus-visible:ring-2'
                  {...register(`rows.${idx}.name` as const)}
                />
              </div>

              {/* Description */}
              <div className='col-span-4 min-w-0'>
                <Textarea
                  placeholder='Notes (bank recon / cutoff / confirmations)...'
                  className='border-muted-foreground/30 focus-visible:ring-primary/30 min-h-10 min-w-0 bg-white shadow-sm focus-visible:ring-2'
                  {...register(`rows.${idx}.description` as const)}
                />
              </div>

              {/* Current */}
              <div className='col-span-2'>
                <Input
                  type='number'
                  className={cn(
                    'border-muted-foreground/30 focus-visible:ring-primary/30 bg-white text-right tabular-nums shadow-sm focus-visible:ring-2',
                    currentIsNeg ? 'text-red-600' : ''
                  )}
                  {...register(currentField, {
                    setValueAs: v => (v === '' ? null : Number(v))
                  })}
                />
              </div>

              {/* Prior (read-only) */}
              <div className='col-span-2'>
                <div className='space-y-2'>
                  <div
                    className={cn(
                      'bg-muted/40 rounded-md px-3 py-2 text-right text-sm tabular-nums',
                      priorIsNeg ? 'text-red-600' : 'text-muted-foreground'
                    )}
                  >
                    {prior
                      ? priorAmount === null || priorAmount === undefined
                        ? '—'
                        : formatNumberWithBrackets(priorAmount)
                      : '—'}
                  </div>

                  {/* Desktop inline prior notes */}
                  {hasPriorDescription ? (
                    <div className='hidden xl:block'>
                      <div className='text-muted-foreground bg-muted/10 line-clamp-3 rounded-md border px-3 py-2 text-xs'>
                        {priorDescription}
                      </div>
                    </div>
                  ) : null}

                  {/* Smaller screens: popover */}
                  {hasPriorDescription ? (
                    <div className='flex justify-end xl:hidden'>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type='button'
                            className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs'
                            title='View prior description'
                          >
                            <Info className='h-4 w-4' />
                            Prior notes
                          </button>
                        </PopoverTrigger>

                        <PopoverContent className='w-90 text-sm'>
                          <div className='font-medium'>Prior period notes</div>
                          <div className='text-muted-foreground mt-2 text-xs whitespace-pre-wrap'>
                            {priorDescription}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Actions column */}
              <div className='col-span-1 flex justify-end pt-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  onClick={() => remove(idx)}
                  title='Remove row'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )
        })}

        {/* Footer actions */}
        <div className='flex items-center justify-between pt-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() =>
              append({
                id: crypto.randomUUID(),
                name: '',
                description: '',
                current: null,
                prior: null
              })
            }
          >
            <Plus className='mr-2 h-4 w-4' />
            Add new line
          </Button>

          <Button type='submit'>Save</Button>
        </div>
      </div>
    </form>
  )
}
