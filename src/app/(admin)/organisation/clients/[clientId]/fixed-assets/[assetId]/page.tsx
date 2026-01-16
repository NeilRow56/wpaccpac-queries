// app/organisation/clients/[clientId]/fixed-assets/[assetId]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  accountingPeriods,
  assetCategories,
  assetPeriodBalances,
  fixedAssets
} from '@/db/schema'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type AssetMaster = {
  id: string
  name: string
  acquisitionDate: string
  originalCost: string
  description: string | null
  depreciationMethod: string
  depreciationRate: string

  // Optional fields
  assetCode?: string | null
  costAdjustment?: string | null
  usefulLifeYears?: number | null

  categoryName?: string | null
}

type PeriodRow = {
  periodId: string
  periodName: string
  startDate: string
  endDate: string

  costBfwd: number
  additions: number
  costAdjustment: number
  disposalsCost: number

  depreciationBfwd: number
  depreciationCharge: number
  depreciationAdjustment: number
  depreciationOnDisposals: number

  disposalProceeds: number
}

const n0 = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatDateGB(d: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(d))
}

function formatWholeGBP(n: number) {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(
    Math.round(Number(n) || 0)
  )
}

export default async function FixedAssetDetailPage({
  params
}: {
  params: Promise<{ clientId: string; assetId: string }>
}) {
  const { clientId, assetId } = await params

  // 1) Asset master + category
  const assetRow = await db
    .select({
      id: fixedAssets.id,
      name: fixedAssets.name,
      acquisitionDate: fixedAssets.acquisitionDate,
      originalCost: fixedAssets.originalCost,
      description: fixedAssets.description,
      depreciationMethod: fixedAssets.depreciationMethod,
      depreciationRate: fixedAssets.depreciationRate,

      // ✅ fully typed now
      assetCode: fixedAssets.assetCode,
      costAdjustment: fixedAssets.costAdjustment,
      usefulLifeYears: fixedAssets.usefulLifeYears,

      categoryName: assetCategories.name
    })
    .from(fixedAssets)
    .leftJoin(assetCategories, eq(fixedAssets.categoryId, assetCategories.id))
    .where(and(eq(fixedAssets.id, assetId), eq(fixedAssets.clientId, clientId)))
    .then(r => r[0])

  if (!assetRow) notFound()

  const asset: AssetMaster = {
    ...assetRow,
    // acquisitionDate can be Date in some schemas; force to string for formatting safety
    acquisitionDate: String(assetRow.acquisitionDate)
  }

  // 2) Period balances joined to periods (all periods where this asset has a row)
  const balanceRows = await db
    .select({
      periodId: accountingPeriods.id,
      periodName: accountingPeriods.periodName,
      startDate: accountingPeriods.startDate,
      endDate: accountingPeriods.endDate,

      costBfwd: assetPeriodBalances.costBfwd,
      additions: assetPeriodBalances.additions,
      costAdjustment: assetPeriodBalances.costAdjustment,
      disposalsCost: assetPeriodBalances.disposalsCost,

      depreciationBfwd: assetPeriodBalances.depreciationBfwd,
      depreciationCharge: assetPeriodBalances.depreciationCharge,
      depreciationAdjustment: assetPeriodBalances.depreciationAdjustment,
      depreciationOnDisposals: assetPeriodBalances.depreciationOnDisposals,

      disposalProceeds: assetPeriodBalances.disposalProceeds
    })
    .from(assetPeriodBalances)
    .innerJoin(
      accountingPeriods,
      eq(assetPeriodBalances.periodId, accountingPeriods.id)
    )
    .where(eq(assetPeriodBalances.assetId, assetId))
    .orderBy(desc(accountingPeriods.endDate))

  const periods: PeriodRow[] = balanceRows.map(r => ({
    periodId: r.periodId,
    periodName: r.periodName,
    startDate: String(r.startDate),
    endDate: String(r.endDate),

    costBfwd: n0(r.costBfwd),
    additions: n0(r.additions),
    costAdjustment: n0(r.costAdjustment),
    disposalsCost: n0(r.disposalsCost),

    depreciationBfwd: n0(r.depreciationBfwd),
    depreciationCharge: n0(r.depreciationCharge),
    depreciationAdjustment: n0(r.depreciationAdjustment),
    depreciationOnDisposals: n0(r.depreciationOnDisposals),

    disposalProceeds: n0(r.disposalProceeds)
  }))

  const latest = periods[0] ?? null

  const latestCostCfwd = latest
    ? latest.costBfwd +
      latest.additions +
      latest.costAdjustment -
      latest.disposalsCost
    : 0

  const latestDepCfwd = latest
    ? latest.depreciationBfwd +
      latest.depreciationCharge +
      latest.depreciationAdjustment -
      latest.depreciationOnDisposals
    : 0

  const latestNbv = Math.max(0, latestCostCfwd - latestDepCfwd)
  const isDisposed = latestCostCfwd < 1

  const disposalPeriods = periods
    .filter(p => p.disposalsCost > 0)
    .map(p => {
      const nbvDisposed = Math.max(
        0,
        p.disposalsCost - p.depreciationOnDisposals
      )
      const profitOrLoss = p.disposalProceeds - nbvDisposed
      return { ...p, nbvDisposed, profitOrLoss }
    })

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex items-center gap-3'>
            <h1 className='truncate text-2xl font-semibold'>{asset.name}</h1>
            {isDisposed ? (
              <Badge variant='secondary'>Fully disposed</Badge>
            ) : (
              <Badge className='bg-green-600'>Active</Badge>
            )}
          </div>
          <p className='text-muted-foreground text-sm'>
            Acquired {formatDateGB(asset.acquisitionDate)}
            {asset.categoryName ? ` • ${asset.categoryName}` : ''}
          </p>
        </div>

        <div className='flex gap-2'>
          <Button asChild variant='outline'>
            <Link href={`/organisation/clients/${clientId}/fixed-assets`}>
              Back to register
            </Link>
          </Button>
        </div>
      </div>

      {/* Two cards row */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* Asset details */}
        <div className='rounded-lg border p-4'>
          <h2 className='font-medium'>Asset details</h2>

          <div className='mt-3 grid grid-cols-1 gap-2 text-sm'>
            <Row label='Category' value={asset.categoryName ?? '—'} />
            <Row
              label='Acquisition date'
              value={formatDateGB(asset.acquisitionDate)}
            />
            <Row
              label='Original cost'
              value={`£${formatWholeGBP(n0(asset.originalCost))}`}
            />
            <Row label='Method' value={String(asset.depreciationMethod)} />
            <Row label='Rate' value={`${asset.depreciationRate}%`} />

            {/* Optional fields only if values exist */}
            {asset.assetCode ? (
              <Row label='Asset code' value={asset.assetCode} />
            ) : null}
            {asset.costAdjustment && n0(asset.costAdjustment) !== 0 ? (
              <Row
                label='Master cost adjustment'
                value={`£${formatWholeGBP(n0(asset.costAdjustment))}`}
              />
            ) : null}
            {asset.usefulLifeYears ? (
              <Row
                label='Useful life'
                value={`${asset.usefulLifeYears} years`}
              />
            ) : null}

            {asset.description ? (
              <Row label='Notes' value={asset.description} />
            ) : null}
          </div>
        </div>

        {/* Totals to date (from latest period) */}
        <div className='rounded-lg border p-4'>
          <h2 className='font-medium'>Totals to date</h2>
          <p className='text-muted-foreground text-sm'>
            {latest
              ? `As at period ended ${formatDateGB(latest.endDate)}`
              : 'No posted periods yet'}
          </p>

          <div className='mt-4 grid grid-cols-3 gap-3'>
            <Metric
              label='Cost c/fwd'
              value={`£${formatWholeGBP(latestCostCfwd)}`}
            />
            <Metric
              label='Accum. dep.'
              value={`£${formatWholeGBP(latestDepCfwd)}`}
            />
            <Metric label='NBV' value={`£${formatWholeGBP(latestNbv)}`} />
          </div>
        </div>
      </div>

      {/* Period breakdown */}
      <div className='rounded-lg border'>
        <div className='border-b p-4'>
          <h2 className='font-medium'>By period</h2>
          <p className='text-muted-foreground text-sm'>
            Cost, depreciation and NBV movements by accounting period.
          </p>
        </div>

        <div className='overflow-x-auto p-4'>
          {periods.length === 0 ? (
            <div className='text-muted-foreground text-sm'>
              No period balances found for this asset yet.
            </div>
          ) : (
            <table className='w-full text-sm'>
              <thead className='text-muted-foreground'>
                <tr className='border-b'>
                  <th className='py-2 text-left'>Period</th>
                  <th className='py-2 text-right'>Cost c/fwd</th>
                  <th className='py-2 text-right'>Dep c/fwd</th>
                  <th className='py-2 text-right'>NBV</th>
                  <th className='py-2 text-right'>Additions</th>
                  <th className='py-2 text-right'>Disposals</th>
                  <th className='py-2 text-right'>Dep charge</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(p => {
                  const costCfwd =
                    p.costBfwd +
                    p.additions +
                    p.costAdjustment -
                    p.disposalsCost
                  const depCfwd =
                    p.depreciationBfwd +
                    p.depreciationCharge +
                    p.depreciationAdjustment -
                    p.depreciationOnDisposals
                  const nbv = Math.max(0, costCfwd - depCfwd)

                  return (
                    <tr key={p.periodId} className='border-b last:border-b-0'>
                      <td className='py-2'>
                        <div className='font-medium'>{p.periodName}</div>
                        <div className='text-muted-foreground text-xs'>
                          {formatDateGB(p.startDate)} –{' '}
                          {formatDateGB(p.endDate)}
                        </div>
                      </td>
                      <td className='py-2 text-right tabular-nums'>
                        £{formatWholeGBP(costCfwd)}
                      </td>
                      <td className='py-2 text-right tabular-nums'>
                        £{formatWholeGBP(depCfwd)}
                      </td>
                      <td className='py-2 text-right font-medium tabular-nums'>
                        £{formatWholeGBP(nbv)}
                      </td>
                      <td className='py-2 text-right tabular-nums'>
                        £{formatWholeGBP(p.additions)}
                      </td>
                      <td className='py-2 text-right text-red-600 tabular-nums'>
                        {p.disposalsCost > 0
                          ? `(${formatWholeGBP(p.disposalsCost)})`
                          : '0'}
                      </td>
                      <td className='py-2 text-right tabular-nums'>
                        £{formatWholeGBP(p.depreciationCharge)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Disposal summary */}
      {disposalPeriods.length > 0 ? (
        <div className='rounded-lg border'>
          <div className='border-b p-4'>
            <h2 className='font-medium'>Disposals</h2>
            <p className='text-muted-foreground text-sm'>
              Summary of disposal figures by period.
            </p>
          </div>

          <div className='overflow-x-auto p-4'>
            <table className='w-full text-sm'>
              <thead className='text-muted-foreground'>
                <tr className='border-b'>
                  <th className='py-2 text-left'>Period</th>
                  <th className='py-2 text-right'>Disposal at cost</th>
                  <th className='py-2 text-right'>Dep eliminated</th>
                  <th className='py-2 text-right'>NBV disposed</th>
                  <th className='py-2 text-right'>Proceeds</th>
                  <th className='py-2 text-right'>Profit/(loss)</th>
                </tr>
              </thead>
              <tbody>
                {disposalPeriods.map(p => (
                  <tr key={p.periodId} className='border-b last:border-b-0'>
                    <td className='py-2'>
                      <div className='font-medium'>{p.periodName}</div>
                      <div className='text-muted-foreground text-xs'>
                        ended {formatDateGB(p.endDate)}
                      </div>
                    </td>
                    <td className='py-2 text-right text-red-600 tabular-nums'>
                      ({formatWholeGBP(p.disposalsCost)})
                    </td>
                    <td className='py-2 text-right text-red-600 tabular-nums'>
                      ({formatWholeGBP(p.depreciationOnDisposals)})
                    </td>
                    <td className='py-2 text-right tabular-nums'>
                      £{formatWholeGBP(p.nbvDisposed)}
                    </td>
                    <td className='py-2 text-right tabular-nums'>
                      £{formatWholeGBP(p.disposalProceeds)}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        p.profitOrLoss < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      £{formatWholeGBP(p.profitOrLoss)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Documents placeholder */}
      <div className='rounded-lg border p-4'>
        <h2 className='font-medium'>Documents</h2>
        <p className='text-muted-foreground text-sm'>
          Attach invoices and supporting documents (coming soon).
        </p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-start justify-between gap-4'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='text-right font-medium'>{value}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className='bg-muted rounded-md p-3'>
      <div className='text-muted-foreground text-xs'>{label}</div>
      <div className='mt-1 text-base font-semibold tabular-nums'>{value}</div>
    </div>
  )
}
