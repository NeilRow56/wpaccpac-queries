'use server'

import { db } from '@/db'
import {
  accountingPeriods,
  assetPeriodBalances,
  depreciationEntries
} from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export type DepScheduleRow = {
  periodId: string
  periodName: string
  startDate: string
  endDate: string

  costBfwd: number
  depreciationBfwd: number
  additions: number
  costAdjustment: number
  disposalsCost: number

  depreciationCharge: number
  depreciationAdjustment: number
  depreciationOnDisposals: number

  openingNBV: number
  closingNBV: number
  closingAccumulatedDepreciation: number

  // ✅ new
  disposalProceeds: number
  nbvDisposed: number
  profitOrLossOnDisposal: number

  isPosted: boolean
}

export async function getAssetDepreciationScheduleAction(params: {
  clientId: string
  assetId: string
}) {
  const { clientId, assetId } = params

  // 1) periods for the client (ordered)
  const periods = await db
    .select({
      id: accountingPeriods.id,
      periodName: accountingPeriods.periodName,
      startDate: accountingPeriods.startDate,
      endDate: accountingPeriods.endDate,
      periodStatus: accountingPeriods.status // ✅
    })
    .from(accountingPeriods)
    .where(eq(accountingPeriods.clientId, clientId))
    .orderBy(asc(accountingPeriods.startDate))

  if (periods.length === 0) {
    return { success: true as const, rows: [] as DepScheduleRow[] }
  }

  // 2) balances for this asset across all periods
  const balances = await db
    .select()
    .from(assetPeriodBalances)
    .where(eq(assetPeriodBalances.assetId, assetId))

  const balancesByPeriodId = new Map(balances.map(b => [b.periodId, b]))

  // 3) depreciation entries for this asset across all periods
  const deps = await db
    .select()
    .from(depreciationEntries)
    .where(eq(depreciationEntries.assetId, assetId))

  const depByPeriodId = new Map(deps.map(d => [d.periodId, d]))

  // 4) build schedule rows period-by-period
  const rows: DepScheduleRow[] = periods.map(p => {
    const bal = balancesByPeriodId.get(p.id)
    const depEntry = depByPeriodId.get(p.id)

    const costBfwd = Number(bal?.costBfwd ?? 0)
    const additions = Number(bal?.additions ?? 0)
    const costAdjustment = Number(bal?.costAdjustment ?? 0)
    const disposalsCost = Number(bal?.disposalsCost ?? 0)

    const depreciationBfwd = Number(bal?.depreciationBfwd ?? 0)

    // Prefer posted depreciationEntries if present; otherwise fall back to balances.depreciationCharge (or 0)
    const depreciationCharge =
      bal != null
        ? Number(bal.depreciationCharge ?? 0)
        : depEntry != null
          ? Number(depEntry.depreciationAmount ?? 0)
          : 0

    const depreciationAdjustment = Number(bal?.depreciationAdjustment ?? 0)
    const depreciationOnDisposals = Number(bal?.depreciationOnDisposals ?? 0)

    const disposalProceeds = Number(bal?.disposalProceeds ?? 0)

    // NBV disposed for the disposed portion this period
    const nbvDisposed = Math.max(0, disposalsCost - depreciationOnDisposals)

    // Profit/(loss) = proceeds - NBV disposed
    const profitOrLossOnDisposal =
      disposalsCost > 0 || disposalProceeds !== 0
        ? disposalProceeds - nbvDisposed
        : 0

    const isPosted = depEntry != null

    const openingNBV = Math.max(0, costBfwd - depreciationBfwd)

    const closingCost = costBfwd + additions + costAdjustment - disposalsCost
    const closingDep =
      depreciationBfwd +
      depreciationCharge +
      depreciationAdjustment -
      depreciationOnDisposals

    const closingAccumulatedDepreciation = Math.max(0, closingDep)

    const closingNBV = Math.max(0, closingCost - closingDep)

    return {
      periodId: p.id,
      periodName: p.periodName,
      startDate: p.startDate,
      endDate: p.endDate,

      costBfwd,
      depreciationBfwd,
      additions,
      costAdjustment,
      disposalsCost,

      depreciationCharge,
      depreciationAdjustment,
      depreciationOnDisposals,

      openingNBV,
      closingNBV,
      closingAccumulatedDepreciation, // ✅ ADD THIS
      disposalProceeds,
      nbvDisposed,
      profitOrLossOnDisposal,
      periodStatus: p.periodStatus,
      isPosted
    }
  })

  return { success: true as const, rows }
}
