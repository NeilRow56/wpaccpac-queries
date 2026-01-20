// app/organisation/clients/[clientId]/accounting-periods/[periodId]/assets/page.tsx

import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/navigation/breadcrumb'

import { getClientById } from '@/server-actions/clients'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'

import ScheduleActions from './_components/schedule-action-buttons'
import { getFixedAssetPeriodSchedule } from '@/lib/fixed-assets/fixed-assets-period-schedule'

import { ChevronDown, ChevronRight } from 'lucide-react'

export function formatMoney(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(n)
}

const formatYMD = (d: string | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(d))

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

function sumCategory(
  rows: Array<{
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
  }>
): CategoryDetailTotals {
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

export default async function FixedAssetsCurrentPeriodPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const client = await getClientById(clientId)

  const data = await getFixedAssetPeriodSchedule({ clientId, periodId })
  if (!data) notFound()

  const { period, categoryTotals, scheduleRows } = data
  if (!client || !period) notFound()

  const crumbs = buildPeriodLeafBreadcrumbs({
    clientId,
    clientName: client.name,
    periodId,
    periodName: period.periodName,
    leafLabel: 'Fixed Assets',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/assets`
  })

  // Grand total (you already added this – kept unchanged)
  const grand = categoryTotals.reduce(
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

  // Group rows by category for supporting schedules
  const rowsByCategory = new Map<string, typeof scheduleRows>()
  for (const r of scheduleRows) {
    const arr = rowsByCategory.get(r.categoryId) ?? []
    arr.push(r)
    rowsByCategory.set(r.categoryId, arr)
  }

  // Preserve category order from the summary table
  const categorySections = categoryTotals.map(ct => ({
    categoryId: ct.categoryId,
    categoryName: ct.categoryName,
    summary: ct,
    rows: rowsByCategory.get(ct.categoryId) ?? []
  }))

  return (
    <div className='space-y-6'>
      <Breadcrumbs crumbs={crumbs} />

      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-xl font-semibold'>
            Fixed assets — current period
          </h1>
          <div className='text-muted-foreground text-sm'>
            Period: {String(formatYMD(period.startDate))} →{' '}
            {String(formatYMD(period.endDate))}
          </div>
        </div>

        <ScheduleActions clientId={clientId} periodId={periodId} />
      </div>

      {/* Category summary (Lead schedule) */}
      <section className='space-y-2'>
        <h2 className='text-sm font-medium'>Category summary</h2>
        <div className='rounded-md border'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50'>
                <tr className='text-left'>
                  <th className='px-3 py-2'>Category</th>
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

                  <th className='px-3 py-2 text-right'>NBV b/f</th>
                  <th className='px-3 py-2 text-right'>NBV c/f</th>
                </tr>
              </thead>

              <tbody>
                {categoryTotals.map(row => (
                  <tr key={row.categoryId} className='border-t'>
                    <td className='px-3 py-2'>{row.categoryName}</td>

                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.costBfwd)}
                    </td>
                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.additions)}
                    </td>
                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.disposalsCost)}
                    </td>
                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.costAdjustment)}
                    </td>
                    <td className='px-3 py-2 text-right font-medium tabular-nums'>
                      {formatMoney(row.costCfwd)}
                    </td>

                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.depreciationBfwd)}
                    </td>
                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.depreciationCharge)}
                    </td>
                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.depreciationOnDisposals)}
                    </td>
                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.depreciationAdjustment)}
                    </td>
                    <td className='px-3 py-2 text-right font-medium tabular-nums'>
                      {formatMoney(row.depreciationCfwd)}
                    </td>

                    <td className='px-3 py-2 text-right tabular-nums'>
                      {formatMoney(row.nbvBfwd)}
                    </td>
                    <td className='px-3 py-2 text-right font-medium tabular-nums'>
                      {formatMoney(row.nbvCfwd)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot className='bg-muted/30'>
                <tr className='border-t font-medium'>
                  <td className='px-3 py-2'>Total</td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.costBfwd)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.additions)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.disposalsCost)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.costAdjustment)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.costCfwd)}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.depreciationBfwd)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.depreciationCharge)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.depreciationOnDisposals)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.depreciationAdjustment)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.depreciationCfwd)}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.nbvBfwd)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoney(grand.nbvCfwd)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* Supporting schedules (by category) */}
      <section className='space-y-2'>
        <h2 className='text-sm font-medium'>Supporting schedules</h2>
        <p className='text-muted-foreground text-xs'>
          The lead schedule above is the category summary. Expand a category
          below to view the supporting register for that class of asset.
        </p>

        <div className='space-y-3'>
          {categorySections.map(section => {
            const rows = section.rows
            const totals = sumCategory(rows)

            return (
              <details key={section.categoryId} className='rounded-md border'>
                <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2'>
                      {/* Simple disclosure chevron (CSS handles rotation in most browsers; keep icons as fallback) */}
                      <span className='text-muted-foreground'>
                        <ChevronRight className='details-closed:inline hidden h-4 w-4' />
                        <ChevronDown className='details-open:inline hidden h-4 w-4' />
                      </span>

                      <span className='font-medium'>
                        {section.categoryName}
                      </span>

                      <span className='text-muted-foreground text-xs'>
                        ({rows.length} asset{rows.length === 1 ? '' : 's'})
                      </span>
                    </div>

                    <div className='text-muted-foreground mt-0.5 text-xs'>
                      Cost c/f {formatMoney(section.summary.costCfwd)} · Depn
                      c/f {formatMoney(section.summary.depreciationCfwd)} · NBV
                      c/f {formatMoney(section.summary.nbvCfwd)}
                    </div>
                  </div>

                  <span className='text-muted-foreground text-xs'>
                    Display schedule
                  </span>
                </summary>

                <div className='border-t'>
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
                        {rows.map(r => {
                          const hasEntry = r.depreciationEntriesCount > 0
                          const mismatch =
                            hasEntry &&
                            !nearlyEqual(
                              r.depreciationEntriesTotal,
                              r.depreciationCharge
                            )

                          return (
                            <tr key={r.assetId} className='border-t'>
                              <td className='px-3 py-2'>
                                <div className='font-medium'>
                                  {r.assetCode ? `${r.assetCode} — ` : ''}
                                  {r.assetName}
                                </div>

                                <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs'>
                                  <span>
                                    {r.depreciationMethod} @{' '}
                                    {r.depreciationRate}%
                                  </span>

                                  {hasEntry && (
                                    <span className='rounded-full border px-2 py-0.5'>
                                      depn entry
                                    </span>
                                  )}

                                  {mismatch && (
                                    <span className='rounded-full border px-2 py-0.5'>
                                      check: entry{' '}
                                      {formatMoney(r.depreciationEntriesTotal)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className='px-3 py-2 text-right tabular-nums'>
                                {formatMoney(r.costBfwd)}
                              </td>
                              <td className='px-3 py-2 text-right tabular-nums'>
                                {formatMoney(r.additions)}
                              </td>
                              <td className='px-3 py-2 text-right tabular-nums'>
                                {formatMoney(r.disposalsCost)}
                              </td>
                              <td className='px-3 py-2 text-right tabular-nums'>
                                {formatMoney(r.costAdjustment)}
                              </td>
                              <td className='px-3 py-2 text-right font-medium tabular-nums'>
                                {formatMoney(r.costCfwd)}
                              </td>

                              <td className='px-3 py-2 text-right tabular-nums'>
                                {formatMoney(r.depreciationBfwd)}
                              </td>
                              <td className='px-3 py-2 text-right tabular-nums'>
                                {formatMoney(r.depreciationCharge)}
                              </td>
                              <td className='px-3 py-2 text-right tabular-nums'>
                                {formatMoney(r.depreciationOnDisposals)}
                              </td>
                              <td className='px-3 py-2 text-right tabular-nums'>
                                {formatMoney(r.depreciationAdjustment)}
                              </td>
                              <td className='px-3 py-2 text-right font-medium tabular-nums'>
                                {formatMoney(r.depreciationCfwd)}
                              </td>

                              <td className='px-3 py-2 text-right font-medium tabular-nums'>
                                {formatMoney(r.nbvCfwd)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>

                      <tfoot className='bg-muted/30'>
                        <tr className='border-t font-medium'>
                          <td className='px-3 py-2'>Subtotal</td>

                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.costBfwd)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.additions)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.disposalsCost)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.costAdjustment)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.costCfwd)}
                          </td>

                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.depreciationBfwd)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.depreciationCharge)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.depreciationOnDisposals)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.depreciationAdjustment)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.depreciationCfwd)}
                          </td>

                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoney(totals.nbvCfwd)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className='text-muted-foreground px-3 py-2 text-xs'>
                    Note: Period balances are the source of truth. Depreciation
                    entries are shown for audit trail only.
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      </section>
    </div>
  )
}
