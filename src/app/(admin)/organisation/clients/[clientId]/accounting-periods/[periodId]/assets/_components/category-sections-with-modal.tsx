// app/organisation/clients/[clientId]/accounting-periods/[periodId]/assets/_components/category-sections-with-modal.tsx
'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

import CategoryScheduleTable from './category-schedule-table'
import type { AssetScheduleRow } from '@/lib/fixed-assets/fixed-assets-period-schedule'

type CategorySummary = {
  categoryId: string
  categoryName: string

  costBfwd: number
  additions: number
  disposalsCost: number
  costAdjustment: number
  costCfwd: number

  depreciationBfwd: number
  depreciationCharge: number
  depreciationOnDisposals: number
  depreciationAdjustment: number
  depreciationCfwd: number

  nbvBfwd: number
  nbvCfwd: number
}

export type CategorySection = {
  categoryId: string
  categoryName: string
  summary: CategorySummary
  rows: AssetScheduleRow[]
}

type CategoryDetailTotals = {
  costBfwd: number
  additions: number
  disposalsCost: number
  costAdjustment: number
  costCfwd: number

  depreciationBfwd: number
  depreciationCharge: number
  depreciationOnDisposals: number
  depreciationAdjustment: number
  depreciationCfwd: number

  nbvBfwd: number
  nbvCfwd: number
}

function formatMoneyNoSymbol(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    currencyDisplay: 'code',
    maximumFractionDigits: 0
  })
    .format(n)
    .replace('GBP', '')
    .trim()
}

function sumCategory(rows: AssetScheduleRow[]): CategoryDetailTotals {
  return rows.reduce(
    (acc, r) => ({
      costBfwd: acc.costBfwd + r.costBfwd,
      additions: acc.additions + r.additions,
      disposalsCost: acc.disposalsCost + r.disposalsCost,
      costAdjustment: acc.costAdjustment + r.costAdjustment,
      costCfwd: acc.costCfwd + r.costCfwd,

      depreciationBfwd: acc.depreciationBfwd + r.depreciationBfwd,
      depreciationCharge: acc.depreciationCharge + r.depreciationCharge,
      depreciationOnDisposals:
        acc.depreciationOnDisposals + r.depreciationOnDisposals,
      depreciationAdjustment:
        acc.depreciationAdjustment + r.depreciationAdjustment,
      depreciationCfwd: acc.depreciationCfwd + r.depreciationCfwd,

      nbvBfwd: acc.nbvBfwd + r.nbvBfwd,
      nbvCfwd: acc.nbvCfwd + r.nbvCfwd
    }),
    {
      costBfwd: 0,
      additions: 0,
      disposalsCost: 0,
      costAdjustment: 0,
      costCfwd: 0,
      depreciationBfwd: 0,
      depreciationCharge: 0,
      depreciationOnDisposals: 0,
      depreciationAdjustment: 0,
      depreciationCfwd: 0,
      nbvBfwd: 0,
      nbvCfwd: 0
    }
  )
}

export default function CategorySectionsWithModal(props: {
  sections: CategorySection[]
  pageSize?: number
}) {
  const { sections, pageSize = 10 } = props

  const [open, setOpen] = React.useState(false)
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const active = React.useMemo(
    () => sections.find(s => s.categoryId === activeId) ?? null,
    [sections, activeId]
  )

  const activeTotals = React.useMemo(() => {
    if (!active) return null
    return sumCategory(active.rows)
  }, [active])

  return (
    <>
      <div className='space-y-3'>
        {sections.map(section => {
          const rows = section.rows

          return (
            <details key={section.categoryId} className='rounded-md border'>
              {/* ✅ summary must be first direct child */}
              <summary className='list-none'>
                <div className='flex items-start justify-between gap-3 px-3 py-2'>
                  <div className='flex min-w-0 cursor-pointer items-start gap-3'>
                    <span className='text-muted-foreground mt-0.5'>
                      <ChevronRight className='details-closed:inline hidden h-4 w-4' />
                      <ChevronDown className='details-open:inline hidden h-4 w-4' />
                    </span>

                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>
                          {section.categoryName}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          ({rows.length} asset{rows.length === 1 ? '' : 's'})
                        </span>
                      </div>

                      <div className='text-muted-foreground mt-0.5 text-xs'>
                        Cost c/f {formatMoneyNoSymbol(section.summary.costCfwd)}{' '}
                        · Depn c/f{' '}
                        {formatMoneyNoSymbol(section.summary.depreciationCfwd)}{' '}
                        · NBV c/f {formatMoneyNoSymbol(section.summary.nbvCfwd)}
                      </div>
                    </div>
                  </div>

                  {/* IMPORTANT: keep this visually in header, but NOT inside summary interactive controls */}
                  <span className='sr-only'>Toggle category</span>
                </div>
              </summary>

              {/* Actions row (outside summary, so no a11y warning) */}
              <div className='flex items-center justify-end gap-2 px-3 pb-2'>
                <Dialog
                  open={open && activeId === section.categoryId}
                  onOpenChange={next => {
                    setOpen(next)
                    if (!next) setActiveId(null)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setActiveId(section.categoryId)
                        setOpen(true)
                      }}
                    >
                      Open
                    </Button>
                  </DialogTrigger>

                  <DialogContent className='w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[calc(80vw-4rem)] sm:max-w-[calc(80vw-4rem)]'>
                    <DialogHeader>
                      <DialogTitle className='flex items-center justify-between gap-3'>
                        <span className='min-w-0 truncate'>
                          {section.categoryName}
                        </span>
                        <span className='text-muted-foreground text-sm font-normal'>
                          {rows.length} asset{rows.length === 1 ? '' : 's'}
                        </span>
                      </DialogTitle>
                    </DialogHeader>

                    <div className='max-h-[80vh] overflow-y-auto rounded-md border'>
                      {active && activeTotals ? (
                        <CategoryScheduleTable
                          rows={active.rows}
                          totals={activeTotals}
                          pageSize={pageSize}
                        />
                      ) : null}
                    </div>
                  </DialogContent>
                </Dialog>

                <span className='text-muted-foreground text-xs'>
                  Display schedule
                </span>
              </div>

              {/* ✅ expanded content uses section rows, not active */}
              <div className='border-t'>
                <CategoryScheduleTable
                  rows={rows}
                  totals={sumCategory(rows)}
                  pageSize={pageSize}
                />
              </div>
            </details>
          )
        })}
      </div>
    </>
  )
}
