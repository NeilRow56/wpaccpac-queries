'use client'

import * as React from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Info, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'

import type { LineItemScheduleDocV1 } from '@/lib/schedules/lineItemScheduleTypes'
import { saveDebtorsPrepaymentsScheduleAction } from '@/server-actions/schedules/debtors-prepayments'

type Props = {
  clientId: string
  periodId: string
  initial: LineItemScheduleDocV1
  prior?: LineItemScheduleDocV1 | null
  priorPeriodLabel?: string
}

export default function PrepaymentsScheduleForm({
  clientId,
  periodId,
  initial,
  prior,
  priorPeriodLabel
}: Props) {
  const form = useForm<LineItemScheduleDocV1>({ defaultValues: initial })
  const { control, register, handleSubmit, reset } = form

  const initialSig = React.useMemo(() => JSON.stringify(initial), [initial])
  React.useEffect(() => {
    reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rows'
  })

  /**
   * Prior column behaviour:
   * - prior amount should show PRIOR PERIOD "current" (last year's current),
   *   not this doc's `prior` field.
   * - description shown is prior period description.
   */
  const priorById = React.useMemo(() => {
    const map = new Map<
      string,
      { amount: number | null; description: string } | null
    >()

    prior?.rows.forEach(r =>
      map.set(r.id, {
        amount: r.current ?? null, // ✅ prior column = last year's current
        description: typeof r.description === 'string' ? r.description : ''
      })
    )

    return map
  }, [prior])

  async function onSubmit(values: LineItemScheduleDocV1) {
    const res = await saveDebtorsPrepaymentsScheduleAction({
      clientId,
      periodId,
      doc: values
    })

    if (res.success) toast.success('Prepayments saved')
    else toast.error(res.message ?? 'Failed to save prepayments')
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='space-y-4 rounded-lg border p-4'
    >
      {/* Header row */}
      <div className='grid grid-cols-[180px_1fr_160px_220px_40px] items-end gap-3 text-sm 2xl:grid-cols-[200px_1.5fr_160px_260px_40px]'>
        <div className='font-medium'>Name</div>
        <div className='font-medium'>Description</div>

        <div className='grid justify-items-center'>
          <span className='text-muted-foreground'>Current year</span>
          <span className='text-muted-foreground text-[11px] leading-none'>
            £
          </span>
        </div>

        <div className='bg-muted/40 grid justify-items-center rounded-md px-2 py-1'>
          <span className='text-red-600'>
            {priorPeriodLabel ?? 'Prior year'}
          </span>
          <span className='text-muted-foreground text-[11px] leading-none'>
            £
          </span>
        </div>

        <div />
      </div>

      {/* Rows */}
      <div className='space-y-2'>
        {fields.map((row, idx) => {
          const priorRow = priorById.get(row.id) ?? null
          const priorAmount = priorRow?.amount ?? null
          const priorDescription = (priorRow?.description ?? '').trim()
          const hasPriorDescription = priorDescription.length > 0

          return (
            <div
              key={row.id}
              className='grid grid-cols-[180px_1fr_160px_220px_40px] items-start gap-3 rounded-md px-2 py-1 2xl:grid-cols-[200px_1.5fr_160px_260px_40px]'
            >
              <Input
                placeholder='e.g. Rates'
                className='border-muted-foreground/30 focus-visible:ring-primary/30 bg-white shadow-sm focus-visible:ring-2'
                {...register(`rows.${idx}.name` as const)}
              />

              <Textarea
                placeholder='Notes / calculation...'
                className='border-muted-foreground/30 focus-visible:ring-primary/30 min-h-10 bg-white shadow-sm focus-visible:ring-2'
                {...register(`rows.${idx}.description` as const)}
              />

              <Input
                type='number'
                className='border-muted-foreground/30 focus-visible:ring-primary/30 bg-white text-right tabular-nums shadow-sm focus-visible:ring-2'
                {...register(`rows.${idx}.current` as const, {
                  setValueAs: v => (v === '' ? null : Number(v))
                })}
              />

              {/* Prior column: read-only amount + (optional) prior description */}
              <div className='space-y-2'>
                <div className='bg-muted/40 text-muted-foreground rounded-md px-3 py-2 text-right text-sm tabular-nums'>
                  {prior ? (priorAmount ?? '—') : '—'}
                </div>

                {/* Desktop: show prior description inline */}
                {hasPriorDescription ? (
                  <div className='hidden xl:block'>
                    <div className='text-muted-foreground bg-muted/10 line-clamp-3 rounded-md border px-3 py-2 text-xs'>
                      {priorDescription}
                    </div>
                  </div>
                ) : null}

                {/* Laptop: hide inline, show via popover */}
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

                      <PopoverContent className='w-[360px] text-sm'>
                        <div className='font-medium'>Prior period notes</div>
                        <div className='text-muted-foreground mt-2 text-xs whitespace-pre-wrap'>
                          {priorDescription}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : null}
              </div>

              <div className='flex justify-end pt-1'>
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
      </div>

      <div className='flex items-center justify-between'>
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
    </form>
  )
}
