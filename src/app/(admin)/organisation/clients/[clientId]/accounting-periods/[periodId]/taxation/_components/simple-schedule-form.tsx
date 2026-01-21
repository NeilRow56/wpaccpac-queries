'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { saveTaxationScheduleAction } from '@/server-actions/simple-schedules/taxation'
import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'
import { toast } from 'sonner'

// function formatMoney(n: number | null | undefined) {
//   if (n == null) return '—'
//   return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n)
// }

function formatPeriodLabel(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric'
  })
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`
}

function toFiniteNumberOrZero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

type Props = {
  title: string
  code: string
  clientId: string
  periodId: string
  initial: SimpleScheduleDocV1
  prior?: SimpleScheduleDocV1 | null
  priorPeriod?: {
    startDate: string
    endDate: string
  } | null
}

export default function SimpleScheduleForm({
  clientId,
  periodId,
  initial,
  prior,
  priorPeriod
}: Props) {
  const form = useForm<SimpleScheduleDocV1>({
    defaultValues: initial,
    values: initial // keeps form in sync if props change
  })

  React.useEffect(() => {
    form.reset(initial)
  }, [initial, form])

  // eslint-disable-next-line react-hooks/incompatible-library, react-hooks/exhaustive-deps
  const sections = form.watch('sections') ?? []

  // Build prior amounts by INPUT line id (TOTAL lines have no amount)
  const priorMap = React.useMemo(() => {
    const map = new Map<string, number | null>()
    prior?.sections.forEach(s => {
      s.lines.forEach(l => {
        if (l.kind === 'INPUT') {
          map.set(l.id, l.amount ?? null)
        }
      })
    })
    return map
  }, [prior])

  // Build current amounts by INPUT line id from watched form state
  const currentAmountMap = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sections) {
      for (const l of s.lines) {
        if (l.kind === 'INPUT') {
          map.set(l.id, toFiniteNumberOrZero(l.amount))
        }
      }
    }
    return map
  }, [sections])

  async function onSubmit(values: SimpleScheduleDocV1) {
    const res = await saveTaxationScheduleAction({
      clientId,
      periodId,
      doc: values
    })

    if (res.success) toast.success('Taxation saved')
    else toast.error(res.message)
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className='space-y-6 rounded-lg border p-4'
    >
      {sections.map((section, sIdx) => (
        <div key={section.id} className='space-y-3'>
          <h3 className='font-medium'>{section.title}</h3>

          {/* Column headers */}
          <div className='grid grid-cols-4 items-end gap-3 text-sm'>
            <div />
            <div className='text-muted-foreground col-span-2 grid justify-items-center'>
              <span>Current year</span>
              <span className='text-[11px] leading-none'>£</span>
            </div>

            <div className='bg-muted/40 grid justify-items-center rounded-md px-2 py-1'>
              <span className='text-red-600'>
                {priorPeriod
                  ? formatPeriodLabel(
                      priorPeriod.startDate,
                      priorPeriod.endDate
                    )
                  : 'Prior year'}
              </span>
              <span className='text-muted-foreground text-[11px] leading-none'>
                £
              </span>
            </div>
          </div>

          {/* Lines */}
          <div className='space-y-2'>
            {section.lines.map((line, lIdx) => {
              // TOTAL (computed)
              if (line.kind === 'TOTAL') {
                const total = line.sumOf.reduce(
                  (acc, id) => acc + (currentAmountMap.get(id) ?? 0),
                  0
                )

                const priorTotal = line.sumOf.reduce((acc, id) => {
                  const v = priorMap.get(id)
                  return acc + toFiniteNumberOrZero(v)
                }, 0)

                return (
                  <div
                    key={line.id}
                    className='grid grid-cols-4 items-center gap-3'
                  >
                    <div className='text-sm font-bold'>{line.label}</div>

                    <div className='bofocus-visible:ring-primary/30 bg-muted/20 col-span-2 flex h-10 w-full items-center justify-end rounded-md border border-gray-700 px-3 font-medium tabular-nums shadow-sm'>
                      {/* {formatMoney(total)} */}
                      {total}
                      <div className='w-3' />
                    </div>

                    <div className='bg-muted/40 text-muted-foreground flex h-10 w-full items-center justify-end rounded-md px-3 text-sm font-medium tabular-nums'>
                      {prior ? priorTotal : '—'}
                    </div>
                  </div>
                )
              }

              // INPUT
              const field = `sections.${sIdx}.lines.${lIdx}.amount` as const
              const priorAmount = priorMap.get(line.id)

              return (
                <div
                  key={line.id}
                  className='grid grid-cols-4 items-center gap-3'
                >
                  <div className='text-sm'>{line.label}</div>

                  <div className='col-span-2'>
                    <Input
                      type='number'
                      className='border-muted-foreground/30 focus-visible:ring-primary/30 w-full border bg-white text-right tabular-nums shadow-sm focus-visible:ring-2'
                      {...form.register(field, {
                        setValueAs: v => (v === '' ? null : Number(v))
                      })}
                    />
                  </div>

                  <div className='bg-muted/40 text-muted-foreground w-full rounded-md px-3 py-2 text-right text-sm tabular-nums'>
                    {/* {formatMoney(priorAmount)} */}
                    {priorAmount}
                  </div>
                </div>
              )
            })}
          </div>

          {section.notes !== undefined && (
            <div className='grid grid-cols-4 gap-3'>
              <div className='text-muted-foreground text-sm'>Notes</div>

              <div className='col-span-2'>
                <Textarea
                  placeholder='Notes'
                  className='border-muted-foreground/30 focus-visible:ring-primary/30 border bg-white shadow-sm focus-visible:ring-2'
                  {...form.register(`sections.${sIdx}.notes` as const)}
                />
              </div>

              {/* Prior column placeholder (keeps the grid aligned) */}
              <div />
            </div>
          )}
        </div>
      ))}

      <div className='flex justify-end'>
        <Button type='submit'>Save</Button>
      </div>
    </form>
  )
}
