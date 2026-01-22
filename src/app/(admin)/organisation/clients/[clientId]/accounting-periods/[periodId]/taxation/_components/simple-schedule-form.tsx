'use client'

import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { saveTaxationScheduleAction } from '@/server-actions/simple-schedules/taxation'
import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'
import { toast } from 'sonner'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

// function formatMoney(n: number | null | undefined) {
//   if (n == null) return '—'
//   return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n)
// }

type SectionUi = {
  emphasis?: 'none' | 'soft' | 'strong'
  tone?: 'default' | 'muted' | 'primary' | 'info' | 'warn'
}

function sectionTitleClass(ui?: SectionUi) {
  const tone =
    ui?.tone === 'primary'
      ? 'text-primary'
      : ui?.tone === 'muted'
        ? 'text-muted-foreground'
        : ui?.tone === 'info'
          ? 'text-blue-700'
          : ui?.tone === 'warn'
            ? 'text-amber-700'
            : 'text-foreground'

  const emph =
    ui?.emphasis === 'strong'
      ? 'font-semibold'
      : ui?.emphasis === 'soft'
        ? 'font-medium'
        : 'font-medium'

  return `${tone} ${emph} text-sm tracking-wide`
}

type LineUi = {
  emphasis?: 'none' | 'soft' | 'strong'
  tone?: 'default' | 'muted' | 'info' | 'warn'
}

function uiRowClass(ui?: LineUi) {
  if (!ui) return ''

  const emph =
    ui.emphasis === 'strong'
      ? 'bg-muted/10'
      : ui.emphasis === 'soft'
        ? 'bg-muted/5'
        : ''

  const tone =
    ui.tone === 'info'
      ? 'bg-blue-50/40 border-l-4 border-blue-500/40'
      : ui.tone === 'warn'
        ? 'bg-amber-50/60 border-l-4 border-amber-500/40'
        : ui.tone === 'muted'
          ? 'bg-muted/10'
          : ''

  return [emph, tone].filter(Boolean).join(' ')
}

function uiLabelClass(ui?: LineUi) {
  if (!ui) return ''
  if (ui.emphasis === 'strong') return 'font-semibold'
  if (ui.emphasis === 'soft') return 'text-muted-foreground'
  return ''
}

function uiInputClass(ui?: LineUi) {
  if (!ui) return ''
  return ui.emphasis === 'strong' ? 'font-semibold' : ''
}

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

function isLikelyUrl(v: string) {
  const s = v.trim()
  return s.startsWith('http://') || s.startsWith('https://')
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
    defaultValues: initial
  })

  const initialSig = React.useMemo(() => JSON.stringify(initial), [initial])

  React.useEffect(() => {
    form.reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sections = useWatch({ control: form.control, name: 'sections' }) ?? []
  const attachments =
    useWatch({ control: form.control, name: 'attachments' }) ?? []

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
      {/* Attachments panel */}
      {attachments.length > 0 ? (
        <div className='bg-muted/10 space-y-3 rounded-md border p-3'>
          <div>
            <div className='text-primary font-medium'>Supporting documents</div>
            <div className='text-muted-foreground text-xs'>
              Paste links to supporting files (e.g. Excel on SharePoint/Drive).
            </div>
          </div>

          <div className='space-y-2'>
            {attachments.map((a, idx) => {
              const urlField = `attachments.${idx}.url` as const
              const urlValue = (a?.url ?? '').trim()
              const canOpen = isLikelyUrl(urlValue)

              return (
                <div
                  key={a.id}
                  className='grid grid-cols-[220px_1fr_44px] items-center gap-3'
                >
                  <div className='text-sm'>{a.name}</div>

                  <Input
                    placeholder='https://...'
                    className='border-muted-foreground/30 focus-visible:ring-primary/30 bg-white shadow-sm focus-visible:ring-2'
                    {...form.register(urlField)}
                  />

                  <div className='flex justify-end'>
                    {canOpen ? (
                      <Link href={urlValue} target='_blank' rel='noreferrer'>
                        <Button type='button' variant='outline' size='icon'>
                          <ExternalLink className='h-4 w-4' />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled
                        title='Enter a full https:// link to enable'
                      >
                        <ExternalLink className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <div key={section.id} className='space-y-3'>
          <h3 className={sectionTitleClass(section.ui)}>{section.title}</h3>

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
                    className={`grid grid-cols-4 items-center gap-3 rounded-md px-2 py-1 ${uiRowClass(line.ui)}`}
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
                  className={`grid grid-cols-4 items-center gap-3 rounded-md px-2 py-1 ${uiRowClass(line.ui)}`}
                >
                  <div className={`text-sm ${uiLabelClass(line.ui)}`}>
                    {line.label}
                  </div>

                  <div className='col-span-2'>
                    <Input
                      type='number'
                      className={`border-muted-foreground/30 focus-visible:ring-primary/30 w-full border bg-white text-right tabular-nums shadow-sm focus-visible:ring-2 ${uiInputClass(line.ui)}`}
                      {...form.register(field, {
                        setValueAs: v => (v === '' ? null : Number(v))
                      })}
                    />
                  </div>

                  <div className='bg-muted/40 text-muted-foreground w-full rounded-md px-3 py-2 text-right text-sm tabular-nums'>
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
