// app/actions/period-actions.ts
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
  fixedAssets as fixedAssetsTable
} from '@/db/schema'
import {
  // closeAccountingPeriodSchema,
  rollAccountingPeriodSchema
} from '@/zod-schemas/accountingPeriod'

export async function createAccountingPeriod(data: {
  clientId: string
  periodName: string
  startDate: string
  endDate: string
}) {
  // before insert
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

    return { success: true }
  } catch (error) {
    console.error('Error creating period:', error)
    return { success: false, error: 'Failed to create period' }
  }
}

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

    // 1. Period must exist
    if (!period) {
      throw new Error('Period not found')
    }

    // 2. Closed periods are immutable
    if (!period.isOpen) {
      throw new Error('Closed accounting periods cannot be modified')
    }

    // 3. Current implies open
    if (data.isCurrent && data.isOpen === false) {
      throw new Error('A current period must be open')
    }

    // If setting as current, unset other current periods
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

    return { success: true }
  } catch (error) {
    console.error('Error updating period:', error)
    return { success: false, error: 'Failed to update period' }
  }
}

export async function deleteAccountingPeriod(id: string) {
  try {
    await db
      .delete(accountingPeriodsTable)
      .where(eq(accountingPeriodsTable.id, id))

    revalidatePath('/fixed-assets/periods')
    return { success: true }
  } catch (error) {
    console.error('Error deleting period:', error)
    return { success: false, error: 'Failed to delete period' }
  }
}

export async function calculatePeriodDepreciationForClient(
  clientId: string,
  periodId: string
) {
  try {
    // Get the period
    const [period] = await db
      .select()
      .from(accountingPeriodsTable)
      .where(
        and(
          eq(accountingPeriodsTable.id, periodId),
          eq(accountingPeriodsTable.clientId, clientId)
        )
      )

    if (!period) {
      return { success: false as const, error: 'Period not found' }
    }

    if (!period.isOpen) {
      return {
        success: false as const,
        error: 'Cannot preview depreciation for a closed period'
      }
    }

    // Get all assets for this client
    const assets = await db
      .select()
      .from(fixedAssetsTable)
      .where(eq(fixedAssetsTable.clientId, clientId))

    const periodStartDate = new Date(period.startDate)
    const periodEndDate = new Date(period.endDate)

    // Calculate depreciation preview for each asset
    const entries = assets.map(asset => {
      const originalCost = Number(asset.originalCost)
      const costAdjustment = Number(asset.costAdjustment ?? 0)
      const depreciationAdjustment = 0
      const totalDepToDate = Number(asset.totalDepreciationToDate ?? 0)

      const depreciationMethod = asset.depreciationMethod as
        | 'straight_line'
        | 'reducing_balance'

      const acquisitionDate = new Date(asset.acquisitionDate)

      const depreciationAmount = calculatePeriodDepreciation({
        originalCost,
        costAdjustment,
        depreciationAdjustment,
        depreciationRate: Number(asset.depreciationRate),
        method: depreciationMethod,
        periodStartDate,
        periodEndDate,
        acquisitionDate,
        totalDepreciationToDate: totalDepToDate
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

    // ✅ PREVIEW ONLY — no DB writes
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
        eq(accountingPeriodsTable.isOpen, true) // add this too (see below)
      )
    )

  if (periods.length > 1) {
    throw new Error(
      `Invariant violation: multiple current accounting periods for client ${clientId}`
    )
  }

  return periods[0] ?? null
}

export async function closeAccountingPeriodAction(input: {
  clientId: string
  periodId: string
}) {
  return postDepreciationAndClosePeriod(input)
}

export async function rollAccountingPeriod(input: unknown) {
  const data = rollAccountingPeriodSchema.parse(input)

  return await db.transaction(async tx => {
    // 1. Close existing current period
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
        .set({
          isOpen: false,
          isCurrent: false
        })
        .where(eq(accountingPeriodsTable.id, current.id))
    }

    // 2. Create new period
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
      // isCurrent: true
      isCurrent: true
    })

    revalidatePath('/accounting-periods')

    return { success: true }
  })
}

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

    const assets = await tx
      .select()
      .from(fixedAssetsTable)
      .where(eq(fixedAssetsTable.clientId, input.clientId))

    const periodStartDate = new Date(period.startDate)
    const periodEndDate = new Date(period.endDate)

    for (const asset of assets) {
      const originalCost = Number(asset.originalCost)
      const costAdjustment = Number(asset.costAdjustment ?? 0)
      const depreciationAdjustment = 0
      const totalDepToDate = Number(asset.totalDepreciationToDate ?? 0)

      const depreciationMethod = asset.depreciationMethod as
        | 'straight_line'
        | 'reducing_balance'

      const acquisitionDate = new Date(asset.acquisitionDate)

      const daysInPeriod = calculateDaysInPeriod(
        periodStartDate,
        periodEndDate,
        acquisitionDate
      )

      const depreciationAmount = calculatePeriodDepreciation({
        originalCost,
        costAdjustment,
        depreciationAdjustment,
        depreciationRate: Number(asset.depreciationRate),
        method: depreciationMethod,
        periodStartDate,
        periodEndDate,
        acquisitionDate,
        totalDepreciationToDate: totalDepToDate
      })

      // 1) Upsert audit trail entry
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

      // 2) Roll forward "to date" (MVP approach that matches your current UI)
      // totalDepreciationToDate is a decimal column -> use SQL arithmetic
      await tx
        .update(fixedAssetsTable)
        .set({
          totalDepreciationToDate: sql`
            (${fixedAssetsTable.totalDepreciationToDate}::numeric + ${depreciationAmount}::numeric)
          `
        })
        .where(eq(fixedAssetsTable.id, asset.id))
    }

    // 3) Close the period
    await tx
      .update(accountingPeriodsTable)
      .set({ isOpen: false, isCurrent: false })
      .where(eq(accountingPeriodsTable.id, period.id))

    revalidatePath('/accounting-periods')
    revalidatePath(`/organisation/clients/${input.clientId}/fixed-assets`)

    return { success: true, assetsPosted: assets.length }
  })
}
