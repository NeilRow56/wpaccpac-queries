'use server'

import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'
import { eq, and, sql } from 'drizzle-orm'

import {
  calculatePeriodDepreciation,
  calculateDaysInPeriod
} from '@/lib/asset-calculations'
import { db } from '@/db'
import {
  AccountingPeriod,
  accountingPeriods as accountingPeriodsTable,
  depreciationEntries,
  fixedAssets as fixedAssetsTable,
  assetPeriodBalances
} from '@/db/schema'
import { rollAccountingPeriodSchema } from '@/zod-schemas/accountingPeriod'

/* ----------------------------------
 * Create period
 * ---------------------------------- */

export async function createAccountingPeriod(data: {
  clientId: string
  periodName: string
  startDate: string
  endDate: string
}) {
  const overlapping = await db
    .select()
    .from(accountingPeriodsTable)
    .where(
      and(
        eq(accountingPeriodsTable.clientId, data.clientId),
        sql`
          daterange(
            ${accountingPeriodsTable.startDate},
            ${accountingPeriodsTable.endDate},
            '[]'
          ) && daterange(${data.startDate}, ${data.endDate}, '[]')
        `
      )
    )

  if (overlapping.length > 0) {
    throw new Error('Accounting period overlaps an existing period')
  }

  // unset existing current
  await db
    .update(accountingPeriodsTable)
    .set({ isCurrent: false })
    .where(eq(accountingPeriodsTable.clientId, data.clientId))

  try {
    await db.insert(accountingPeriodsTable).values({
      clientId: data.clientId,
      periodName: data.periodName,
      startDate: data.startDate,
      endDate: data.endDate,
      isCurrent: true,
      isOpen: true
    })

    revalidatePath('/accounting-periods')
    return { success: true as const }
  } catch (error) {
    console.error('Error creating period:', error)
    return { success: false as const, error: 'Failed to create period' }
  }
}

/* ----------------------------------
 * Update period
 * ---------------------------------- */

export async function updateAccountingPeriod(data: {
  id: string
  periodName: string
  startDate: string
  endDate: string
  isCurrent?: boolean
  isOpen?: boolean
}) {
  try {
    const [period] = await db
      .select()
      .from(accountingPeriodsTable)
      .where(eq(accountingPeriodsTable.id, data.id))

    if (!period) throw new Error('Period not found')
    if (!period.isOpen)
      throw new Error('Closed accounting periods cannot be modified')

    if (data.isCurrent && data.isOpen === false) {
      throw new Error('A current period must be open')
    }

    if (data.isCurrent) {
      await db
        .update(accountingPeriodsTable)
        .set({ isCurrent: false })
        .where(
          and(
            eq(accountingPeriodsTable.clientId, period.clientId),
            sql`${accountingPeriodsTable.id} != ${data.id}`
          )
        )
    }

    await db
      .update(accountingPeriodsTable)
      .set({
        periodName: data.periodName,
        startDate: data.startDate,
        endDate: data.endDate,
        isCurrent: data.isCurrent ?? false,
        isOpen: data.isOpen ?? period.isOpen
      })
      .where(eq(accountingPeriodsTable.id, data.id))

    revalidatePath('/accounting-periods')
    return { success: true as const }
  } catch (error) {
    console.error('Error updating period:', error)
    return { success: false as const, error: 'Failed to update period' }
  }
}

/* ----------------------------------
 * Delete period
 * ---------------------------------- */

export async function deleteAccountingPeriod(id: string) {
  try {
    await db
      .delete(accountingPeriodsTable)
      .where(eq(accountingPeriodsTable.id, id))
    revalidatePath('/fixed-assets/periods')
    return { success: true as const }
  } catch (error) {
    console.error('Error deleting period:', error)
    return { success: false as const, error: 'Failed to delete period' }
  }
}

/* ----------------------------------
 * Preview depreciation (NO DB writes)
 * ---------------------------------- */

export async function calculatePeriodDepreciationForClient(
  clientId: string,
  periodId: string
) {
  try {
    const [period] = await db
      .select()
      .from(accountingPeriodsTable)
      .where(
        and(
          eq(accountingPeriodsTable.id, periodId),
          eq(accountingPeriodsTable.clientId, clientId)
        )
      )

    if (!period) return { success: false as const, error: 'Period not found' }
    if (!period.isOpen) {
      return {
        success: false as const,
        error: 'Cannot preview depreciation for a closed period'
      }
    }

    const [assets, balances] = await Promise.all([
      db
        .select()
        .from(fixedAssetsTable)
        .where(eq(fixedAssetsTable.clientId, clientId)),

      db
        .select()
        .from(assetPeriodBalances)
        .where(eq(assetPeriodBalances.periodId, period.id))
    ])

    const balancesByAssetId = new Map(balances.map(b => [b.assetId, b]))

    const periodStartDate = new Date(period.startDate)
    const periodEndDate = new Date(period.endDate)

    const entries = assets.map(asset => {
      const acquisitionDate = new Date(asset.acquisitionDate)
      const originalCost = Number(asset.originalCost)
      const masterCostAdj = Number(asset.costAdjustment ?? 0)

      const method = asset.depreciationMethod as
        | 'straight_line'
        | 'reducing_balance'

      const bal = balancesByAssetId.get(asset.id)

      const openingCost = bal
        ? Number(bal.costBfwd)
        : acquisitionDate < periodStartDate
          ? originalCost + masterCostAdj
          : 0

      const openingAccumulatedDepreciation = bal
        ? Number(bal.depreciationBfwd)
        : acquisitionDate < periodStartDate
          ? Number(asset.totalDepreciationToDate ?? 0) // transitional fallback
          : 0

      const depreciationAmount = calculatePeriodDepreciation({
        originalCost,
        openingCost,
        openingAccumulatedDepreciation,
        depreciationRate: Number(asset.depreciationRate),
        method,
        periodStartDate,
        periodEndDate,
        acquisitionDate
      })

      const daysInPeriod = calculateDaysInPeriod(
        periodStartDate,
        periodEndDate,
        acquisitionDate
      )

      return {
        assetId: asset.id,
        periodId: period.id,
        depreciationAmount: depreciationAmount.toFixed(2),
        daysInPeriod,
        rateUsed: asset.depreciationRate
      }
    })

    return { success: true as const, entries }
  } catch (error) {
    console.error('Error previewing period depreciation:', error)
    return { success: false as const, error: 'Failed to preview depreciation' }
  }
}

/* ----------------------------------
 * Get accounting period by ID
 * ---------------------------------- */

export async function getAccountingPeriodById(
  periodId: string
): Promise<AccountingPeriod | null> {
  const period = await db.query.accountingPeriods.findFirst({
    where: eq(accountingPeriodsTable.id, periodId)
  })
  return period ?? null
}

export async function getCurrentAccountingPeriod(
  clientId: string
): Promise<AccountingPeriod | null> {
  noStore()

  const periods = await db
    .select()
    .from(accountingPeriodsTable)
    .where(
      and(
        eq(accountingPeriodsTable.clientId, clientId),
        eq(accountingPeriodsTable.isCurrent, true),
        eq(accountingPeriodsTable.isOpen, true)
      )
    )

  if (periods.length > 1) {
    throw new Error(
      `Invariant violation: multiple current accounting periods for client ${clientId}`
    )
  }

  return periods[0] ?? null
}

/* ----------------------------------
 * Close period (posts depreciation + rolls BFWD)
 * ---------------------------------- */

export async function closeAccountingPeriodAction(input: {
  clientId: string
  periodId: string
}) {
  return postDepreciationAndClosePeriod(input)
}

/* ----------------------------------
 * Roll period (creates new current, closes existing current)
 * ---------------------------------- */

export async function rollAccountingPeriod(input: unknown) {
  const data = rollAccountingPeriodSchema.parse(input)

  return await db.transaction(async tx => {
    const current = await tx.query.accountingPeriods.findFirst({
      where: and(
        eq(accountingPeriodsTable.clientId, data.clientId),
        eq(accountingPeriodsTable.isCurrent, true)
      )
    })

    if (current) {
      if (!current.isOpen) {
        throw new Error('Current period is already closed')
      }

      await tx
        .update(accountingPeriodsTable)
        .set({ isOpen: false, isCurrent: false })
        .where(eq(accountingPeriodsTable.id, current.id))
    }

    await tx.insert(accountingPeriodsTable).values({
      clientId: data.clientId,
      periodName: data.periodName,
      startDate:
        typeof data.startDate === 'string'
          ? data.startDate
          : data.startDate.toISOString().slice(0, 10),
      endDate:
        typeof data.endDate === 'string'
          ? data.endDate
          : data.endDate.toISOString().slice(0, 10),
      isOpen: true,
      isCurrent: true
    })

    revalidatePath('/accounting-periods')
    return { success: true as const }
  })
}

/* ----------------------------------
 * Helper: find next period (must exist)
 * ---------------------------------- */

type Tx = Parameters<typeof db.transaction>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never

async function getNextPeriodOrThrow(
  tx: Tx,
  clientId: string,
  currentPeriod: AccountingPeriod
) {
  const next = await tx
    .select()
    .from(accountingPeriodsTable)
    .where(
      and(
        eq(accountingPeriodsTable.clientId, clientId),
        sql`${accountingPeriodsTable.startDate} > ${currentPeriod.endDate}`
      )
    )
    .orderBy(accountingPeriodsTable.startDate)
    .limit(1)

  const nextPeriod = next[0]
  if (!nextPeriod) {
    throw new Error(
      'Cannot close period: no next accounting period exists. Create the next period first.'
    )
  }

  return nextPeriod
}

/* ----------------------------------
 * POST depreciation and close period
 *
 * - Writes depreciation_entries (audit trail)
 * - Writes asset_period_balances (depreciationCharge, closing position)
 * - Creates next period BFWD rows (costBfwd + depreciationBfwd)
 * - Closes current period
 * ---------------------------------- */

export async function postDepreciationAndClosePeriod(input: {
  clientId: string
  periodId: string
}) {
  return await db.transaction(async tx => {
    const period = await tx.query.accountingPeriods.findFirst({
      where: and(
        eq(accountingPeriodsTable.id, input.periodId),
        eq(accountingPeriodsTable.clientId, input.clientId)
      )
    })

    if (!period) throw new Error('Accounting period not found')
    if (!period.isOpen) throw new Error('Accounting period is already closed')
    if (!period.isCurrent)
      throw new Error('Only the current period can be closed')

    // Require next period so we can roll BFWD in one atomic close
    const nextPeriod = await getNextPeriodOrThrow(tx, input.clientId, period)

    const [assets, balances] = await Promise.all([
      tx
        .select()
        .from(fixedAssetsTable)
        .where(eq(fixedAssetsTable.clientId, input.clientId)),

      tx
        .select()
        .from(assetPeriodBalances)
        .where(eq(assetPeriodBalances.periodId, period.id))
    ])

    const balancesByAssetId = new Map(balances.map(b => [b.assetId, b]))

    const periodStartDate = new Date(period.startDate)
    const periodEndDate = new Date(period.endDate)

    for (const asset of assets) {
      const acquisitionDate = new Date(asset.acquisitionDate)
      const originalCost = Number(asset.originalCost)
      const masterCostAdj = Number(asset.costAdjustment ?? 0)

      const method = asset.depreciationMethod as
        | 'straight_line'
        | 'reducing_balance'

      // Existing balances row for this period (preferred)
      const bal = balancesByAssetId.get(asset.id)

      // Opening cost + opening depreciation
      const openingCost = bal
        ? Number(bal.costBfwd)
        : acquisitionDate < periodStartDate
          ? originalCost + masterCostAdj // transitional fallback
          : 0

      const additions = bal
        ? Number(bal.additions)
        : acquisitionDate >= periodStartDate && acquisitionDate <= periodEndDate
          ? originalCost
          : 0

      const costAdjustmentForPeriod = bal ? Number(bal.costAdjustment) : 0
      const disposalsCost = bal ? Number(bal.disposalsCost) : 0

      const openingAccumulatedDepreciation = bal
        ? Number(bal.depreciationBfwd)
        : acquisitionDate < periodStartDate
          ? Number(asset.totalDepreciationToDate ?? 0) // transitional fallback
          : 0

      const depreciationAmount = calculatePeriodDepreciation({
        originalCost,
        openingCost,
        openingAccumulatedDepreciation,
        depreciationRate: Number(asset.depreciationRate),
        method,
        periodStartDate,
        periodEndDate,
        acquisitionDate
      })

      const daysInPeriod = calculateDaysInPeriod(
        periodStartDate,
        periodEndDate,
        acquisitionDate
      )

      // 1) Upsert depreciation audit entry
      await tx
        .insert(depreciationEntries)
        .values({
          assetId: asset.id,
          periodId: period.id,
          depreciationAmount: depreciationAmount.toFixed(2),
          daysInPeriod,
          rateUsed: asset.depreciationRate
        })
        .onConflictDoUpdate({
          target: [depreciationEntries.assetId, depreciationEntries.periodId],
          set: {
            depreciationAmount: depreciationAmount.toFixed(2),
            daysInPeriod,
            rateUsed: asset.depreciationRate
          }
        })

      // 2) Upsert period balances for THIS period
      // Closing cost and closing accumulated depreciation for this period
      const closingCost =
        openingCost + additions + costAdjustmentForPeriod - disposalsCost

      const depreciationOnDisposals = bal
        ? Number(bal.depreciationOnDisposals)
        : 0
      const depreciationAdjustment = bal
        ? Number(bal.depreciationAdjustment)
        : 0

      const closingAccumulatedDepreciation =
        openingAccumulatedDepreciation +
        depreciationAmount -
        depreciationOnDisposals +
        depreciationAdjustment

      await tx
        .insert(assetPeriodBalances)
        .values({
          assetId: asset.id,
          periodId: period.id,

          costBfwd: openingCost.toFixed(2),
          additions: additions.toFixed(2),
          disposalsCost: disposalsCost.toFixed(2),
          costAdjustment: costAdjustmentForPeriod.toFixed(2),

          depreciationBfwd: openingAccumulatedDepreciation.toFixed(2),
          depreciationCharge: depreciationAmount.toFixed(2),
          depreciationOnDisposals: depreciationOnDisposals.toFixed(2),
          depreciationAdjustment: depreciationAdjustment.toFixed(2)
        })
        .onConflictDoUpdate({
          target: [assetPeriodBalances.assetId, assetPeriodBalances.periodId],
          set: {
            costBfwd: openingCost.toFixed(2),
            additions: additions.toFixed(2),
            disposalsCost: disposalsCost.toFixed(2),
            costAdjustment: costAdjustmentForPeriod.toFixed(2),

            depreciationBfwd: openingAccumulatedDepreciation.toFixed(2),
            depreciationCharge: depreciationAmount.toFixed(2),
            depreciationOnDisposals: depreciationOnDisposals.toFixed(2),
            depreciationAdjustment: depreciationAdjustment.toFixed(2)
          }
        })

      // 3) Create / update NEXT period BFWD row
      // BFWD = this period closing position (cost & depreciation)
      await tx
        .insert(assetPeriodBalances)
        .values({
          assetId: asset.id,
          periodId: nextPeriod.id,

          costBfwd: closingCost.toFixed(2),
          additions: '0',
          disposalsCost: '0',
          costAdjustment: '0',

          depreciationBfwd: closingAccumulatedDepreciation.toFixed(2),
          depreciationCharge: '0',
          depreciationOnDisposals: '0',
          depreciationAdjustment: '0'
        })
        .onConflictDoUpdate({
          target: [assetPeriodBalances.assetId, assetPeriodBalances.periodId],
          set: {
            costBfwd: closingCost.toFixed(2),
            depreciationBfwd: closingAccumulatedDepreciation.toFixed(2)
          }
        })
    }

    // 4) Close the period
    await tx
      .update(accountingPeriodsTable)
      .set({ isOpen: false, isCurrent: false })
      .where(eq(accountingPeriodsTable.id, period.id))

    revalidatePath('/accounting-periods')
    revalidatePath(`/organisation/clients/${input.clientId}/fixed-assets`)
    return {
      success: true as const,
      assetsPosted: assets.length,
      nextPeriodId: nextPeriod.id
    }
  })
}
