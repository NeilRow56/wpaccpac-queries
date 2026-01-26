'use client'

import * as React from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronDown, ExternalLink, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'

import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'

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

type SaveFn = (args: {
  clientId: string
  periodId: string
  doc: SimpleScheduleDocV1
}) => Promise<{ success: boolean; message?: string }>

type Props = {
  title: string
  clientId: string
  periodId: string
  initial: SimpleScheduleDocV1
  prior?: SimpleScheduleDocV1 | null
  priorPeriod?: {
    startDate: string
    endDate: string
  } | null
  onSave: SaveFn
  derivedLineIds?: string[]
  derivedHelpByLineId?: Record<string, string>
  templateAttachmentIds?: string[]
}

export default function SimpleScheduleForm({
  title,
  clientId,
  periodId,
  initial,
  prior,
  priorPeriod,
  onSave,
  derivedLineIds,
  derivedHelpByLineId,
  templateAttachmentIds
}: Props) {
  const form = useForm<SimpleScheduleDocV1>({
    defaultValues: initial
  })

  useUnsavedChangesWarning(form.formState.isDirty)
  const { watch } = form

  const initialSig = React.useMemo(() => JSON.stringify(initial), [initial])

  React.useEffect(() => {
    form.reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSig])

  const templateIds = React.useMemo(
    () => new Set(templateAttachmentIds ?? []),
    [templateAttachmentIds]
  )

  // Watched sections for totals
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sections = useWatch({ control: form.control, name: 'sections' }) ?? []

  // Attachments as field array (supports add/remove/rename)
  const {
    fields: attachmentFields,
    append: appendAttachment,
    remove: removeAttachment
  } = useFieldArray({
    control: form.control,
    name: 'attachments'
  })

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
    const res = await onSave({ clientId, periodId, doc: values })

    if (res.success) {
      toast.success(`${title} saved`)
      form.reset(values)
    } // ✅ marks clean
    else toast.error(res.message ?? `Failed to save ${title}`)
  }

  const hasAttachments = (attachmentFields?.length ?? 0) > 0

  function sumIds(map: Map<string, number>, ids: string[]) {
    return ids.reduce((acc, id) => acc + (map.get(id) ?? 0), 0)
  }

  function sumIdsPrior(map: Map<string, number | null>, ids: string[]) {
    return ids.reduce((acc, id) => acc + toFiniteNumberOrZero(map.get(id)), 0)
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className='space-y-4 rounded-lg border p-4'
    >
      {/* Attachments panel */}
      {hasAttachments ? (
        <Collapsible defaultOpen>
          <div className='bg-muted/10 rounded-md border'>
            <div className='flex items-start justify-between gap-3 p-3'>
              <div>
                <div className='text-primary font-medium'>
                  Supporting documents
                </div>
                <div className='text-muted-foreground text-xs'>
                  Paste links to supporting files (e.g. Excel on
                  SharePoint/Drive).
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    appendAttachment(
                      {
                        id: crypto.randomUUID(),
                        name: '',
                        url: ''
                      },
                      { shouldFocus: true } // ✅ auto-focus first input in the appended row
                    )
                  }
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Add
                </Button>

                <CollapsibleTrigger asChild>
                  <Button variant='ghost' size='sm' className='gap-2'>
                    <span className='text-muted-foreground text-xs'>
                      {attachmentFields.length}
                    </span>
                    <ChevronDown className='h-4 w-4' />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent>
              <div className='space-y-2 px-3 pb-3'>
                {attachmentFields.map((a, idx) => {
                  const isTemplate = templateIds.has(a.id)

                  const nameField = `attachments.${idx}.name` as const
                  const urlField = `attachments.${idx}.url` as const

                  // ✅ use watch so open button updates immediately as user types (no stale getValues)
                  const urlValue = (watch(urlField) ?? '').trim()
                  const canOpen = isLikelyUrl(urlValue)

                  return (
                    <div
                      key={a.id}
                      className='grid grid-cols-[220px_1fr_44px_44px] items-center gap-3'
                    >
                      <Input
                        placeholder='Attachment name' // ✅ placeholder instead of hard-coded default
                        className='border-muted-foreground/30 focus-visible:ring-primary/30 bg-white shadow-sm focus-visible:ring-2'
                        {...form.register(nameField)}
                      />

                      <Input
                        placeholder='https://...'
                        className='border-muted-foreground/30 focus-visible:ring-primary/30 bg-white shadow-sm focus-visible:ring-2'
                        {...form.register(urlField)}
                      />

                      <div className='flex justify-end'>
                        {canOpen ? (
                          <Link
                            href={urlValue}
                            target='_blank'
                            rel='noreferrer'
                          >
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

                      <div className='flex justify-end'>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          onClick={() => removeAttachment(idx)}
                          disabled={isTemplate}
                          title={
                            isTemplate
                              ? 'Template attachments cannot be deleted'
                              : 'Remove attachment row'
                          }
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ) : // If you ever want “Add attachment” even when empty, swap this null for a small panel.
      null}

      {/* Sections */}
      {sections.map((section, sIdx) => (
        <div key={section.id} className='space-y-2'>
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

                    <div className='focus-visible:ring-primary/30 bg-muted/20 col-span-2 flex h-10 w-full items-center justify-end rounded-md border border-gray-700 px-3 font-medium tabular-nums shadow-sm'>
                      {total}
                      <div className='w-3' />
                    </div>

                    <div className='bg-muted/40 text-muted-foreground flex h-10 w-full items-center justify-end rounded-md px-3 text-sm font-medium tabular-nums'>
                      {prior ? priorTotal : '—'}
                    </div>
                  </div>
                )
              }

              // CALC (computed: add - subtract)
              if (line.kind === 'CALC') {
                const add = sumIds(currentAmountMap, line.add)
                const sub = sumIds(currentAmountMap, line.subtract ?? [])
                const total = add - sub

                const priorAdd = sumIdsPrior(priorMap, line.add)
                const priorSub = sumIdsPrior(priorMap, line.subtract ?? [])
                const priorTotal = priorAdd - priorSub

                return (
                  <div
                    key={line.id}
                    className={`grid grid-cols-4 items-center gap-3 rounded-md px-2 py-1 ${uiRowClass(line.ui)}`}
                  >
                    <div className='text-sm font-bold'>{line.label}</div>

                    <div className='focus-visible:ring-primary/30 bg-muted/20 col-span-2 flex h-10 w-full items-center justify-end rounded-md border border-gray-700 px-3 font-medium tabular-nums shadow-sm'>
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
              const isDerived = derivedLineIds?.includes(line.id) ?? false
              const help = derivedHelpByLineId?.[line.id]

              return (
                <div
                  key={line.id}
                  className={`grid grid-cols-4 items-center gap-3 rounded-md px-2 py-0.5 ${uiRowClass(line.ui)}`}
                >
                  <div className={`text-sm ${uiLabelClass(line.ui)}`}>
                    {line.label}
                  </div>

                  <div className='col-span-2'>
                    <Input
                      type='number'
                      disabled={isDerived}
                      className={`border-muted-foreground/30 focus-visible:ring-primary/30 w-full border bg-white text-right tabular-nums shadow-sm focus-visible:ring-2 ${uiInputClass(line.ui)} ${
                        isDerived ? 'bg-muted/30 text-muted-foreground' : ''
                      }`}
                      {...form.register(field, {
                        setValueAs: v => (v === '' ? null : Number(v))
                      })}
                    />

                    {help ? (
                      <div className='text-muted-foreground mt-1 text-xs'>
                        {help}
                      </div>
                    ) : null}
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
                  placeholder={
                    section.id === 'provision'
                      ? 'Bad debt provisions are typically deducted from trade debtors; however, provisions relating to other debtor balances may also be included. The above totals should be presented net of provisions for accounts disclosure as appropriate.'
                      : 'Notes'
                  }
                  className='border-muted-foreground/30 focus-visible:ring-primary/30 border bg-white shadow-sm focus-visible:ring-2'
                  {...form.register(`sections.${sIdx}.notes` as const)}
                />
              </div>

              <div />
            </div>
          )}
        </div>
      ))}

      <div className='sticky bottom-0 z-10 -mx-4 border-t bg-white/95 px-4 py-3 backdrop-blur'>
        <div className='flex items-center justify-end'>
          <Button type='submit'>Save</Button>
        </div>
      </div>
    </form>
  )
}
