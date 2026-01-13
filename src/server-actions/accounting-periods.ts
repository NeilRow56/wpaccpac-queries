'use server'

import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'
import { eq, and, sql } from 'drizzle-orm'

import {
  calculatePeriodDepreciationFromBalances,
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
import {
  rollAccountingPeriodSchema,
  closeAccountingPeriodSchema
} from '@/zod-schemas/accountingPeriod'

function revalidateClientAccountingPages(clientId: string) {
  revalidatePath(`/organisation/clients/${clientId}/accounting-periods`)
  revalidatePath(`/organisation/clients/${clientId}/fixed-assets`)
}
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
  try {
    await db.transaction(async tx => {
      await tx
        .update(accountingPeriodsTable)
        .set({ isCurrent: false })
        .where(eq(accountingPeriodsTable.clientId, data.clientId))

      await tx.insert(accountingPeriodsTable).values({
        clientId: data.clientId,
        periodName: data.periodName,
        startDate: data.startDate,
        endDate: data.endDate,
        isCurrent: true,
        isOpen: true
      })
    })

    revalidateClientAccountingPages(data.clientId)
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

    // Invariant: a current period must be open
    if (data.isCurrent === true && data.isOpen === false) {
      throw new Error('A current period must be open')
    }

    await db.transaction(async tx => {
      // If making this period current, unset any other current period for the same client
      if (data.isCurrent === true) {
        await tx
          .update(accountingPeriodsTable)
          .set({ isCurrent: false })
          .where(
            and(
              eq(accountingPeriodsTable.clientId, period.clientId),
              sql`${accountingPeriodsTable.id} != ${data.id}`
            )
          )
      }

      // Update the period itself.
      // IMPORTANT: preserve existing isCurrent unless explicitly provided
      await tx
        .update(accountingPeriodsTable)
        .set({
          periodName: data.periodName,
          startDate: data.startDate,
          endDate: data.endDate,
          isCurrent: data.isCurrent ?? period.isCurrent,
          isOpen: data.isOpen ?? period.isOpen
        })
        .where(eq(accountingPeriodsTable.id, data.id))
    })

    revalidateClientAccountingPages(period.clientId)
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
    const [period] = await db
      .select({ clientId: accountingPeriodsTable.clientId })
      .from(accountingPeriodsTable)
      .where(eq(accountingPeriodsTable.id, id))

    if (!period) return { success: false as const, error: 'Period not found' }

    await db
      .delete(accountingPeriodsTable)
      .where(eq(accountingPeriodsTable.id, id))

    // ✅ Revalidate client-scoped pages that depend on periods
    revalidateClientAccountingPages(period.clientId)

    return { success: true as const }
  } catch (error) {
    console.error('Error deleting period:', error)
    return { success: false as const, error: 'Failed to delete period' }
  }
}

// ---- date-only helpers (YYYY-MM-DD) ----
// ----------------------------------
// Date-only helpers (YYYY-MM-DD, UTC)
// ----------------------------------

function assertYMD(label: string, ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) throw new Error(`${label} is invalid (expected YYYY-MM-DD)`)

  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])

  const dt = new Date(Date.UTC(y, mo - 1, d))
  const roundTrip = dt.toISOString().slice(0, 10)
  if (roundTrip !== ymd) {
    throw new Error(`${label} is invalid`)
  }
}

function ymdToUtcDate(label: string, ymd: string): Date {
  assertYMD(label, ymd)
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function addDaysYMD(ymd: string, days: number): string {
  assertYMD('Date', ymd)
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function toUtcDateFromDateOrYMD(label: string, value: string | Date): Date {
  if (value instanceof Date) return value
  return ymdToUtcDate(label, value)
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

    const periodStartDate = ymdToUtcDate('Period start date', period.startDate)

    const periodEndDate = ymdToUtcDate('Period end date', period.endDate)

    const entries = assets.map(asset => {
      const acquisitionDate = toUtcDateFromDateOrYMD(
        'Acquisition date',
        asset.acquisitionDate as unknown as string | Date
      )
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

      const additionsAtCost = bal
        ? Number(bal.additions)
        : acquisitionDate >= periodStartDate && acquisitionDate <= periodEndDate
          ? originalCost
          : 0

      const costAdjustmentForPeriod = bal ? Number(bal.costAdjustment) : 0
      const disposalsAtCost = bal ? Number(bal.disposalsCost) : 0

      const depreciationAmount = calculatePeriodDepreciationFromBalances({
        openingCost,
        additionsAtCost,
        costAdjustmentForPeriod,
        disposalsAtCost,
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

export async function closeAccountingPeriodAction(input: unknown) {
  try {
    const data = closeAccountingPeriodSchema.parse(input)
    return await postDepreciationAndClosePeriod(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return { success: false as const, error: message }
  }
}

/* ----------------------------------
 * Roll period (creates new current, closes existing current)
 * ---------------------------------- */

export async function rollAccountingPeriod(input: unknown) {
  try {
    const data = rollAccountingPeriodSchema.parse(input)

    await db.transaction(async tx => {
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
        startDate: data.startDate,
        endDate: data.endDate,

        isOpen: true,
        isCurrent: true
      })
    })

    revalidateClientAccountingPages(data.clientId)

    return { success: true as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return { success: false as const, error: message }
  }
}

/* ----------------------------------
 * Helper: find next period (must exist)
 * ---------------------------------- */

type Tx = Parameters<typeof db.transaction>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never

async function findOrCreateNextPeriod(
  tx: Tx,
  clientId: string,
  next: { periodName: string; startDate: string; endDate: string }
) {
  // basic sanity checks (date-only, UTC safe)
  assertYMD('Next period start date', next.startDate)
  assertYMD('Next period end date', next.endDate)

  if (next.startDate > next.endDate) {
    throw new Error('Next period start date must be before end date')
  }

  // If exact match exists, reuse it
  const existing = await tx
    .select()
    .from(accountingPeriodsTable)
    .where(
      and(
        eq(accountingPeriodsTable.clientId, clientId),
        eq(accountingPeriodsTable.startDate, next.startDate),
        eq(accountingPeriodsTable.endDate, next.endDate)
      )
    )
    .limit(1)

  if (existing[0]) return existing[0]

  // Optional: overlap protection (recommended)
  const overlapping = await tx
    .select({ id: accountingPeriodsTable.id })
    .from(accountingPeriodsTable)
    .where(
      and(
        eq(accountingPeriodsTable.clientId, clientId),
        sql`
          daterange(${accountingPeriodsTable.startDate}, ${accountingPeriodsTable.endDate}, '[]')
          && daterange(${next.startDate}, ${next.endDate}, '[]')
        `
      )
    )
    .limit(1)

  if (overlapping[0]) {
    throw new Error('Next period overlaps an existing accounting period')
  }

  const [created] = await tx
    .insert(accountingPeriodsTable)
    .values({
      clientId,
      periodName: next.periodName,
      startDate: next.startDate,
      endDate: next.endDate,
      isOpen: false,
      isCurrent: false
    })
    .returning()

  if (!created) throw new Error('Failed to create next accounting period')
  return created
}

export async function postDepreciationAndClosePeriod(input: {
  clientId: string
  periodId: string
  nextPeriod: {
    periodName: string
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
  }
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

    // ---- replace your existing block with this ----
    const currentEndYMD = period.endDate // already YYYY-MM-DD in your schema
    const proposedNextStartYMD = input.nextPeriod.startDate

    assertYMD('Current period end date', currentEndYMD)
    assertYMD('Next period start date', proposedNextStartYMD)

    // UX rule: next period must start on/after the next day
    const earliestAllowedStart = addDaysYMD(currentEndYMD, 1)

    if (proposedNextStartYMD < earliestAllowedStart) {
      throw new Error(
        `Next period must start on or after ${earliestAllowedStart} (the day after the current period end date)`
      )
    }

    // Create or reuse next period from UI input
    const nextPeriod = await findOrCreateNextPeriod(
      tx,
      input.clientId,
      input.nextPeriod
    )

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

    const periodStartDate = ymdToUtcDate('Period start date', period.startDate)

    const periodEndDate = ymdToUtcDate('Period end date', period.endDate)

    for (const asset of assets) {
      const acquisitionDate = toUtcDateFromDateOrYMD(
        'Acquisition date',
        asset.acquisitionDate as unknown as string | Date
      )
      const originalCost = Number(asset.originalCost)
      const masterCostAdj = Number(asset.costAdjustment ?? 0)

      const method = asset.depreciationMethod as
        | 'straight_line'
        | 'reducing_balance'

      const bal = balancesByAssetId.get(asset.id)

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

      const depreciationAmount = calculatePeriodDepreciationFromBalances({
        openingCost,
        additionsAtCost: additions,
        costAdjustmentForPeriod,
        disposalsAtCost: disposalsCost,
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

    // 4) Close current period
    await tx
      .update(accountingPeriodsTable)
      .set({ isOpen: false, isCurrent: false })
      .where(eq(accountingPeriodsTable.id, period.id))

    // 5) Make next period the open/current period (only now, after closing current)
    await tx
      .update(accountingPeriodsTable)
      .set({ isOpen: true, isCurrent: true })
      .where(eq(accountingPeriodsTable.id, nextPeriod.id))

    revalidateClientAccountingPages(input.clientId)

    return {
      success: true as const,
      assetsPosted: assets.length,
      nextPeriodId: nextPeriod.id
    }
  })
}
