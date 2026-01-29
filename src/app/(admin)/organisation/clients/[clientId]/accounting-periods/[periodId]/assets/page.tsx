// app/organisation/clients/[clientId]/accounting-periods/[periodId]/assets/page.tsx

import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/navigation/breadcrumb'

import { getClientById } from '@/server-actions/clients'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'

import ScheduleActions from './_components/schedule-action-buttons'
import { getFixedAssetPeriodSchedule } from '@/lib/fixed-assets/fixed-assets-period-schedule'

import CategorySectionsWithModal from './_components/category-sections-with-modal'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function formatMoney(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(n)
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

function formatMoneyRedBrackets(n: number) {
  const abs = Math.abs(n)
  const txt = formatMoneyNoSymbol(abs)
  return `(${txt})`
}

function MoneyHeader({ label }: { label: string }) {
  return (
    <div className='grid'>
      <span className='text-right'>{label}</span>
      <span className='text-muted-foreground justify-self-center text-[12px] leading-none'>
        £
      </span>
    </div>
  )
}

const formatYMD = (d: string | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(d))

type FixedAssetScheduleData = Awaited<
  ReturnType<typeof getFixedAssetPeriodSchedule>
>
type ScheduleRow = NonNullable<FixedAssetScheduleData>['scheduleRows'][number]

/* ----------------------------------
 * Disposal P&L helpers
 * ---------------------------------- */

type DisposalLine = {
  assetId: string
  assetCode: string | null
  assetName: string
  categoryId: string
  categoryName: string

  costDisposed: number
  depreciationOnDisposal: number
  proceeds: number

  nbvDisposed: number
  profitLoss: number
}

function computeDisposalLines(rows: ScheduleRow[]): DisposalLine[] {
  return rows
    .map(r => {
      const costDisposed = Number(r.disposalsCost ?? 0)
      const depreciationOnDisposal = Number(r.depreciationOnDisposals ?? 0)

      const proceeds =
        'disposalProceeds' in r
          ? Number((r as { disposalProceeds?: unknown }).disposalProceeds ?? 0)
          : 0

      const nbvDisposed = costDisposed - depreciationOnDisposal
      const profitLoss = proceeds - nbvDisposed

      return {
        assetId: r.assetId,
        assetCode: r.assetCode ?? null,
        assetName: r.assetName,
        categoryId: r.categoryId,
        categoryName: r.categoryName,

        costDisposed,
        depreciationOnDisposal,
        proceeds,

        nbvDisposed,
        profitLoss
      }
    })
    .filter(l => l.costDisposed !== 0 || l.proceeds !== 0)
    .sort((a, b) => Math.abs(b.costDisposed) - Math.abs(a.costDisposed))
}

function sumDisposal(lines: DisposalLine[]) {
  return lines.reduce(
    (acc, l) => ({
      costDisposed: acc.costDisposed + l.costDisposed,
      depreciationOnDisposal:
        acc.depreciationOnDisposal + l.depreciationOnDisposal,
      proceeds: acc.proceeds + l.proceeds,
      nbvDisposed: acc.nbvDisposed + l.nbvDisposed,
      profitLoss: acc.profitLoss + l.profitLoss
    }),
    {
      costDisposed: 0,
      depreciationOnDisposal: 0,
      proceeds: 0,
      nbvDisposed: 0,
      profitLoss: 0
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

  const categorySections = categoryTotals.map(ct => ({
    categoryId: ct.categoryId,
    categoryName: ct.categoryName,
    summary: ct,
    rows: rowsByCategory.get(ct.categoryId) ?? []
  }))

  // Disposal P&L (hidden if no disposals)
  const disposalLines = computeDisposalLines(scheduleRows)
  const hasDisposals =
    disposalLines.length > 0 &&
    disposalLines.some(
      l => Math.abs(l.costDisposed) > 0.00001 || Math.abs(l.proceeds) > 0.00001
    )
  const disposalTotals = sumDisposal(disposalLines)

  // ✅ Finance lease totals (NBV c/f + depn charge for period)
  // ✅ Finance lease totals (NBV c/f + depn charge for period)
  const leased = scheduleRows.filter(r => r.isFinanceLease)

  const leasedClosingNBV = leased.reduce((acc, r) => acc + (r.nbvCfwd ?? 0), 0)

  const leasedDepCharge = leased.reduce(
    (acc, r) => acc + (r.depreciationCharge ?? 0),
    0
  )

  const hasLeased = leased.length > 0

  return (
    <div className='space-y-6'>
      <Breadcrumbs crumbs={crumbs} />

      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-xl font-semibold'>Fixed assets</h1>
          <div className='text-muted-foreground text-sm'>
            Current period · {formatYMD(period.startDate)} →{' '}
            {formatYMD(period.endDate)}
          </div>
        </div>
        <Button asChild variant='outline' size='sm'>
          <Link
            href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/B61-fixed_assets_wp`}
          >
            B61 — Fixed assets work programme
          </Link>
        </Button>
        <ScheduleActions clientId={clientId} periodId={periodId} />
      </div>

      {/* Category summary (Lead schedule) */}
      <section className='space-y-2'>
        <h2 className='text-primary text-lg font-medium'>Category summary</h2>

        <div className='rounded-md border'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/50'>
                <tr className='text-left'>
                  <th className='px-3 py-2'>Category</th>

                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Cost b/f' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Additions' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Disposals' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Adj' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Cost c/f' />
                  </th>

                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Depn b/f' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Charge' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='On disp.' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Adj' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='Depn c/f' />
                  </th>

                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='NBV b/f' />
                  </th>
                  <th className='px-3 py-2 text-right'>
                    <MoneyHeader label='NBV c/f' />
                  </th>
                </tr>
              </thead>

              <tbody>
                {categoryTotals.map(row => {
                  const hasDispCost = Math.abs(row.disposalsCost) > 0.00001
                  const hasDispDep =
                    Math.abs(row.depreciationOnDisposals) > 0.00001

                  return (
                    <tr key={row.categoryId} className='border-t'>
                      <td className='px-3 py-2'>{row.categoryName}</td>

                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(row.costBfwd)}
                      </td>
                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(row.additions)}
                      </td>

                      <td className='px-3 py-2 text-right tabular-nums'>
                        {hasDispCost ? (
                          <span className='text-red-600'>
                            {formatMoneyRedBrackets(row.disposalsCost)}
                          </span>
                        ) : (
                          formatMoneyNoSymbol(row.disposalsCost)
                        )}
                      </td>

                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(row.costAdjustment)}
                      </td>
                      <td className='px-3 py-2 text-right font-medium tabular-nums'>
                        {formatMoneyNoSymbol(row.costCfwd)}
                      </td>

                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(row.depreciationBfwd)}
                      </td>
                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(row.depreciationCharge)}
                      </td>

                      <td className='px-3 py-2 text-right tabular-nums'>
                        {hasDispDep ? (
                          <span className='text-red-600'>
                            {formatMoneyRedBrackets(
                              row.depreciationOnDisposals
                            )}
                          </span>
                        ) : (
                          formatMoneyNoSymbol(row.depreciationOnDisposals)
                        )}
                      </td>

                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(row.depreciationAdjustment)}
                      </td>
                      <td className='px-3 py-2 text-right font-medium tabular-nums'>
                        {formatMoneyNoSymbol(row.depreciationCfwd)}
                      </td>

                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(row.nbvBfwd)}
                      </td>
                      <td className='px-3 py-2 text-right font-medium tabular-nums'>
                        {formatMoneyNoSymbol(row.nbvCfwd)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot className='bg-muted/30'>
                <tr className='border-t font-medium'>
                  <td className='px-3 py-2'>Total</td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.costBfwd)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.additions)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {Math.abs(grand.disposalsCost) > 0.00001 ? (
                      <span className='text-red-600'>
                        {formatMoneyRedBrackets(grand.disposalsCost)}
                      </span>
                    ) : (
                      formatMoneyNoSymbol(grand.disposalsCost)
                    )}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.costAdjustment)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.costCfwd)}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.depreciationBfwd)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.depreciationCharge)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {Math.abs(grand.depreciationOnDisposals) > 0.00001 ? (
                      <span className='text-red-600'>
                        {formatMoneyRedBrackets(grand.depreciationOnDisposals)}
                      </span>
                    ) : (
                      formatMoneyNoSymbol(grand.depreciationOnDisposals)
                    )}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.depreciationAdjustment)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.depreciationCfwd)}
                  </td>

                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.nbvBfwd)}
                  </td>
                  <td className='px-3 py-2 text-right tabular-nums'>
                    {formatMoneyNoSymbol(grand.nbvCfwd)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* Profit / Loss on disposals */}
      {hasDisposals ? (
        <section className='space-y-2'>
          <h2 className='text-primary text-lg font-medium'>
            Profit / loss on disposals
          </h2>

          <details className='rounded-md border'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2'>
              <div className='min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='text-muted-foreground'>
                    <ChevronRight className='details-closed:inline hidden h-4 w-4' />
                    <ChevronDown className='details-open:inline hidden h-4 w-4' />
                  </span>

                  <span className='font-medium'>Disposal summary</span>

                  <span className='text-muted-foreground text-xs'>
                    ({disposalLines.length} item
                    {disposalLines.length === 1 ? '' : 's'})
                  </span>
                </div>

                <div className='text-muted-foreground mt-0.5 text-xs'>
                  Proceeds {formatMoneyNoSymbol(disposalTotals.proceeds)} · NBV
                  disposed {formatMoneyNoSymbol(disposalTotals.nbvDisposed)} ·
                  P/(L){' '}
                  <span
                    className={
                      disposalTotals.profitLoss >= 0
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }
                  >
                    {disposalTotals.profitLoss >= 0
                      ? formatMoneyNoSymbol(disposalTotals.profitLoss)
                      : `(${formatMoneyNoSymbol(Math.abs(disposalTotals.profitLoss))})`}
                  </span>
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
                      <th className='px-3 py-2'>Category</th>
                      <th className='px-3 py-2 text-right'>Cost disposed</th>
                      <th className='px-3 py-2 text-right'>Depn eliminated</th>
                      <th className='px-3 py-2 text-right'>NBV disposed</th>
                      <th className='px-3 py-2 text-right'>Proceeds</th>
                      <th className='px-3 py-2 text-right'>Profit / (loss)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {disposalLines.map(l => {
                      const plIsProfit = l.profitLoss >= 0
                      return (
                        <tr key={`${l.assetId}-disp`} className='border-t'>
                          <td className='px-3 py-2'>
                            <div className='font-medium'>
                              {l.assetCode ? `${l.assetCode} — ` : ''}
                              {l.assetName}
                            </div>
                          </td>
                          <td className='px-3 py-2'>{l.categoryName}</td>

                          <td className='px-3 py-2 text-right tabular-nums'>
                            <span className='text-red-600'>
                              {formatMoneyRedBrackets(l.costDisposed)}
                            </span>
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            <span className='text-red-600'>
                              {formatMoneyRedBrackets(l.depreciationOnDisposal)}
                            </span>
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoneyNoSymbol(l.nbvDisposed)}
                          </td>
                          <td className='px-3 py-2 text-right tabular-nums'>
                            {formatMoneyNoSymbol(l.proceeds)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-medium tabular-nums ${
                              plIsProfit ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {plIsProfit
                              ? formatMoneyNoSymbol(l.profitLoss)
                              : `(${formatMoneyNoSymbol(Math.abs(l.profitLoss))})`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>

                  <tfoot className='bg-muted/30'>
                    <tr className='border-t font-medium'>
                      <td className='px-3 py-2' colSpan={2}>
                        Total
                      </td>
                      <td className='px-3 py-2 text-right tabular-nums'>
                        <span className='text-red-600'>
                          {formatMoneyRedBrackets(disposalTotals.costDisposed)}
                        </span>
                      </td>
                      <td className='px-3 py-2 text-right tabular-nums'>
                        <span className='text-red-600'>
                          {formatMoneyRedBrackets(
                            disposalTotals.depreciationOnDisposal
                          )}
                        </span>
                      </td>
                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(disposalTotals.nbvDisposed)}
                      </td>
                      <td className='px-3 py-2 text-right tabular-nums'>
                        {formatMoneyNoSymbol(disposalTotals.proceeds)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          disposalTotals.profitLoss >= 0
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}
                      >
                        {disposalTotals.profitLoss >= 0
                          ? formatMoneyNoSymbol(disposalTotals.profitLoss)
                          : `(${formatMoneyNoSymbol(Math.abs(disposalTotals.profitLoss))})`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className='text-muted-foreground px-3 py-2 text-xs'>
                Note: Proceeds come from disposal movements posted to this
                period. If proceeds are missing, check the asset disposal entry.
              </div>
            </div>
          </details>
        </section>
      ) : null}

      {/* ✅ Finance lease summary */}
      {hasLeased ? (
        <div className='bg-muted/20 rounded-md border px-3 py-2 text-sm'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            <span className='font-medium'>Finance leased assets</span>
            <span className='text-muted-foreground text-xs'>
              ({leased.length} item{leased.length === 1 ? '' : 's'})
            </span>
            <span className='text-muted-foreground'>·</span>
            <span className='text-muted-foreground'>
              NBV c/fwd{' '}
              <span className='tabular-nums'>
                {formatMoneyNoSymbol(leasedClosingNBV)}
              </span>
            </span>
            <span className='text-muted-foreground'>·</span>
            <span className='text-muted-foreground'>
              Dep&apos;n for period{' '}
              <span className='tabular-nums'>
                {formatMoneyNoSymbol(leasedDepCharge)}
              </span>
            </span>
          </div>
        </div>
      ) : null}

      {/* Supporting schedules (now rendered via client component with modal support) */}
      <section className='space-y-2'>
        <h2 className='text-primary text-lg font-medium'>
          Supporting schedules
        </h2>
        <p className='text-muted-foreground text-xs'>
          Click a category to view the supporting register - click “Open” to
          view it in a modal without scrolling.
        </p>

        <CategorySectionsWithModal sections={categorySections} pageSize={10} />
      </section>
    </div>
  )
}
