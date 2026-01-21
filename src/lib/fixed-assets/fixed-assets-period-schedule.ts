import { db } from '@/db'
import {
  fixedAssets,
  assetCategories,
  assetPeriodBalances,
  depreciationEntries,
  accountingPeriods
} from '@/db/schema'
import { and, count, eq, sum } from 'drizzle-orm'

/**
 * Drizzle decimals come back as string by default.
 */
function d(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v)
  return 0
}

export type AssetScheduleRow = {
  assetId: string
  assetCode: string | null
  assetName: string
  categoryId: string
  categoryName: string

  acquisitionDate: string // ISO date or yyyy-mm-dd
  depreciationMethod: string
  depreciationRate: string // keep as string for display

  // schedule fields (numbers)
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

  // ✅ disposal proceeds for P&L on sale
  disposalProceeds: number

  // audit trail info
  depreciationEntriesCount: number
  depreciationEntriesTotal: number
}

export type CategoryScheduleTotals = {
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

export async function getFixedAssetPeriodSchedule(params: {
  clientId: string
  periodId: string
}) {
  const { clientId, periodId } = params

  // Safety: ensure period belongs to client
  const period = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.id, periodId),
      eq(accountingPeriods.clientId, clientId)
    )
  })
  if (!period) return null

  // Base rows: assets + categories, with optional period balances
  const rows = await db
    .select({
      assetId: fixedAssets.id,
      assetCode: fixedAssets.assetCode,
      assetName: fixedAssets.name,
      acquisitionDate: fixedAssets.acquisitionDate,
      depreciationMethod: fixedAssets.depreciationMethod,
      depreciationRate: fixedAssets.depreciationRate,

      categoryId: assetCategories.id,
      categoryName: assetCategories.name,

      // balances (nullable due to left join)
      costBfwd: assetPeriodBalances.costBfwd,
      additions: assetPeriodBalances.additions,
      disposalsCost: assetPeriodBalances.disposalsCost,
      costAdjustment: assetPeriodBalances.costAdjustment,

      depreciationBfwd: assetPeriodBalances.depreciationBfwd,
      depreciationCharge: assetPeriodBalances.depreciationCharge,
      depreciationOnDisposals: assetPeriodBalances.depreciationOnDisposals,
      depreciationAdjustment: assetPeriodBalances.depreciationAdjustment,

      // ✅ proceeds (for P&L schedule)
      disposalProceeds: assetPeriodBalances.disposalProceeds
    })
    .from(fixedAssets)
    .innerJoin(assetCategories, eq(assetCategories.id, fixedAssets.categoryId))
    .leftJoin(
      assetPeriodBalances,
      and(
        eq(assetPeriodBalances.assetId, fixedAssets.id),
        eq(assetPeriodBalances.periodId, periodId)
      )
    )
    .where(eq(fixedAssets.clientId, clientId))
    .orderBy(assetCategories.name, fixedAssets.name)

  // Depreciation audit totals per asset for this period
  const depnAgg = await db
    .select({
      assetId: depreciationEntries.assetId,
      cnt: count(depreciationEntries.id).as('cnt'),
      total: sum(depreciationEntries.depreciationAmount).as('total')
    })
    .from(depreciationEntries)
    .innerJoin(
      accountingPeriods,
      eq(accountingPeriods.id, depreciationEntries.periodId)
    )
    .where(
      and(
        eq(depreciationEntries.periodId, periodId),
        eq(accountingPeriods.clientId, clientId)
      )
    )
    .groupBy(depreciationEntries.assetId)

  const depnByAsset = new Map<string, { cnt: number; total: number }>(
    depnAgg.map(r => [
      r.assetId,
      {
        cnt: Number(r.cnt ?? 0),
        total: d(r.total)
      }
    ])
  )

  const scheduleRows: AssetScheduleRow[] = rows.map(r => {
    const costBfwd = d(r.costBfwd)
    const additions = d(r.additions)
    const disposalsCost = d(r.disposalsCost)
    const costAdjustment = d(r.costAdjustment)

    const depreciationBfwd = d(r.depreciationBfwd)
    const depreciationCharge = d(r.depreciationCharge)
    const depreciationOnDisposals = d(r.depreciationOnDisposals)
    const depreciationAdjustment = d(r.depreciationAdjustment)

    const disposalProceeds = d(r.disposalProceeds)

    const costCfwd = costBfwd + additions - disposalsCost + costAdjustment
    const depreciationCfwd =
      depreciationBfwd +
      depreciationCharge -
      depreciationOnDisposals +
      depreciationAdjustment

    const nbvBfwd = Math.max(0, costBfwd - depreciationBfwd)
    const nbvCfwd = Math.max(0, costCfwd - depreciationCfwd)

    const depn = depnByAsset.get(r.assetId) ?? { cnt: 0, total: 0 }

    return {
      assetId: r.assetId,
      assetCode: r.assetCode ?? null,
      assetName: r.assetName,
      categoryId: r.categoryId,
      categoryName: r.categoryName,

      acquisitionDate: String(r.acquisitionDate),
      depreciationMethod: String(r.depreciationMethod),
      depreciationRate: String(r.depreciationRate),

      costBfwd,
      additions,
      disposalsCost,
      costAdjustment,
      costCfwd,

      depreciationBfwd,
      depreciationCharge,
      depreciationOnDisposals,
      depreciationAdjustment,
      depreciationCfwd,

      nbvBfwd,
      nbvCfwd,

      disposalProceeds,

      depreciationEntriesCount: depn.cnt,
      depreciationEntriesTotal: depn.total
    }
  })

  // Category totals
  const totalsMap = new Map<string, CategoryScheduleTotals>()

  for (const r of scheduleRows) {
    const key = r.categoryId
    const cur =
      totalsMap.get(key) ??
      ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,

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
      } satisfies CategoryScheduleTotals)

    cur.costBfwd += r.costBfwd
    cur.additions += r.additions
    cur.disposalsCost += r.disposalsCost
    cur.costAdjustment += r.costAdjustment
    cur.costCfwd += r.costCfwd

    cur.depreciationBfwd += r.depreciationBfwd
    cur.depreciationCharge += r.depreciationCharge
    cur.depreciationOnDisposals += r.depreciationOnDisposals
    cur.depreciationAdjustment += r.depreciationAdjustment
    cur.depreciationCfwd += r.depreciationCfwd

    cur.nbvBfwd += r.nbvBfwd
    cur.nbvCfwd += r.nbvCfwd

    totalsMap.set(key, cur)
  }

  const categoryTotals = Array.from(totalsMap.values()).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName)
  )

  return { period, scheduleRows, categoryTotals }
}
