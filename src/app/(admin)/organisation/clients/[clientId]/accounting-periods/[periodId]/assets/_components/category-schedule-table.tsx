// app/organisation/clients/[clientId]/accounting-periods/[periodId]/assets/_components/category-schedule-table.tsx
'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import type { AssetScheduleRow } from '@/lib/fixed-assets/fixed-assets-period-schedule'

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

function formatMoneyRedBrackets(n: number) {
  const abs = Math.abs(n)
  const txt = formatMoneyNoSymbol(abs)
  return `(${txt})`
}

function nearlyEqual(a: number, b: number, tolerance = 0.01) {
  return Math.abs(a - b) <= tolerance
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

export default function CategoryScheduleTable(props: {
  rows: AssetScheduleRow[]
  totals: CategoryDetailTotals
  pageSize?: number
}) {
  const { rows, totals, pageSize = 10 } = props

  const [page, setPage] = React.useState(0)

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)

  React.useEffect(() => {
    // keep page in range if rows change
    setPage(p => Math.min(p, pageCount - 1))
  }, [pageCount])

  const start = safePage * pageSize
  const end = Math.min(start + pageSize, rows.length)
  const visible = rows.slice(start, end)

  const canPrev = safePage > 0
  const canNext = safePage < pageCount - 1

  return (
    <>
      <div className='flex items-center justify-between gap-3 px-3 py-2'>
        <div className='text-muted-foreground text-xs'>
          Showing {rows.length === 0 ? 0 : start + 1}–{end} of {rows.length}
        </div>

        {rows.length > pageSize ? (
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!canPrev}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Prev
            </Button>

            <div className='text-muted-foreground text-xs tabular-nums'>
              Page {safePage + 1} / {pageCount}
            </div>

            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!canNext}
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='bg-muted/50'>
            <tr className='text-left'>
              <th className='px-3 py-2'>Asset</th>

              <th className='px-3 py-2 text-right'>Cost b/f</th>
              <th className='px-3 py-2 text-right'>Additions</th>
              <th className='px-3 py-2 text-right'>Disposals</th>
              <th className='px-3 py-2 text-right'>Adj</th>
              <th className='px-3 py-2 text-right'>Cost c/f</th>

              <th className='px-3 py-2 text-right'>Depn b/f</th>
              <th className='px-3 py-2 text-right'>Charge</th>
              <th className='px-3 py-2 text-right'>On disp.</th>
              <th className='px-3 py-2 text-right'>Adj</th>
              <th className='px-3 py-2 text-right'>Depn c/f</th>

              <th className='px-3 py-2 text-right'>NBV c/f</th>
            </tr>
          </thead>

          <tbody>
            {visible.map(r => {
              const hasEntry = r.depreciationEntriesCount > 0
              const mismatch =
                hasEntry &&
                !nearlyEqual(r.depreciationEntriesTotal, r.depreciationCharge)

              const hasDispCost = Math.abs(r.disposalsCost) > 0.00001
              const hasDispDep = Math.abs(r.depreciationOnDisposals) > 0.00001

              return (
                <tr key={r.assetId} className='border-t'>
                  <td className='px-3 py-2'>
                    <div className='font-medium'>
                      {r.assetCode ? `${r.assetCode} — ` : ''}
                      {r.assetName}
                    </div>

                    <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs'>
                      <span>
                        {r.depreciationMethod} @ {r.depreciationRate}%
                      </span>

                      {hasEntry && (
                        <span className='rounded-full border px-2 py-0.5'>
                          depn entry
                        </span>
                      )}

                      {mismatch && (
                        <span className='rounded-full border px-2 py-0.5'>
                          check: entry{' '}
                          {formatMoneyNoSymbol(r.depreciationEntriesTotal)}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(r.costBfwd)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(r.additions)}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {hasDispCost ? (
                      <span className='text-red-600'>
                        {formatMoneyRedBrackets(r.disposalsCost)}
                      </span>
                    ) : (
                      formatMoneyNoSymbol(r.disposalsCost)
                    )}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(r.costAdjustment)}
                  </td>
                  <td className='px-3 py-2 text-right font-medium tabular-nums'>
                    {formatMoneyNoSymbol(r.costCfwd)}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(r.depreciationBfwd)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(r.depreciationCharge)}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {hasDispDep ? (
                      <span className='text-red-600'>
                        {formatMoneyRedBrackets(r.depreciationOnDisposals)}
                      </span>
                    ) : (
                      formatMoneyNoSymbol(r.depreciationOnDisposals)
                    )}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(r.depreciationAdjustment)}
                  </td>
                  <td className='px-3 py-2 text-right font-medium tabular-nums'>
                    {formatMoneyNoSymbol(r.depreciationCfwd)}
                  </td>

                  <td className='px-3 py-2 text-right font-medium tabular-nums'>
                    {formatMoneyNoSymbol(r.nbvCfwd)}
                  </td>
                </tr>
              )
            })}
          </tbody>

          <tfoot className='bg-muted/30'>
            <tr className='border-t font-medium'>
              <td className='px-3 py-2'>Subtotal</td>

              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.costBfwd)}
              </td>
              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.additions)}
              </td>
              <td className='px-3 py-2 text-right tabular-nums'>
                {Math.abs(totals.disposalsCost) > 0.00001 ? (
                  <span className='text-red-600'>
                    {formatMoneyRedBrackets(totals.disposalsCost)}
                  </span>
                ) : (
                  formatMoneyNoSymbol(totals.disposalsCost)
                )}
              </td>
              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.costAdjustment)}
              </td>
              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.costCfwd)}
              </td>

              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.depreciationBfwd)}
              </td>
              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.depreciationCharge)}
              </td>
              <td className='px-3 py-2 text-right tabular-nums'>
                {Math.abs(totals.depreciationOnDisposals) > 0.00001 ? (
                  <span className='text-red-600'>
                    {formatMoneyRedBrackets(totals.depreciationOnDisposals)}
                  </span>
                ) : (
                  formatMoneyNoSymbol(totals.depreciationOnDisposals)
                )}
              </td>
              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.depreciationAdjustment)}
              </td>
              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.depreciationCfwd)}
              </td>

              <td className='px-3 py-2 text-right tabular-nums'>
                {formatMoneyNoSymbol(totals.nbvCfwd)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className='text-muted-foreground px-3 py-2 text-xs'>
        Note: Period balances are the source of truth. Depreciation entries are
        shown for audit trail only.
      </div>
    </>
  )
}
