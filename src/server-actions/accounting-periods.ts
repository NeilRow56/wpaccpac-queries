// app/actions/period-actions.ts
'use server'

import { revalidatePath } from 'next/cache'

import { eq, and, sql } from 'drizzle-orm'
import {
  calculatePeriodDepreciation,
  calculateDaysInPeriod
} from '@/lib/asset-calculations'
import { db } from '@/db'
import {
  accountingPeriods as accountingPeriodsTable,
  depreciationEntries,
  fixedAssets
} from '@/db/schema'

export async function createAccountingPeriod(data: {
  clientId: string
  periodName: string
  startDate: string
  endDate: string
  isCurrent?: boolean
}) {
  try {
    // If setting as current, unset other current periods
    if (data.isCurrent) {
      await db
        .update(accountingPeriodsTable)
        .set({ isCurrent: false })
        .where(eq(accountingPeriodsTable.clientId, data.clientId))
    }

    await db.insert(accountingPeriodsTable).values({
      clientId: data.clientId,
      periodName: data.periodName,
      startDate: data.startDate,
      endDate: data.endDate,
      isCurrent: data.isCurrent ?? false,
      isOpen: true
    })

    revalidatePath('/fixed-assets/periods')
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

    if (!period) {
      return { success: false, error: 'Period not found' }
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

    revalidatePath('/fixed-assets/periods')
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
      return { success: false, error: 'Period not found' }
    }

    // Get all assets for this client
    const assets = await db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.clientId, clientId))

    // Calculate depreciation for each asset
    const entries = []

    for (const asset of assets) {
      const adjustedCost =
        parseFloat(asset.cost) + parseFloat(asset.adjustment || '0')
      const totalDepToDate = parseFloat(asset.totalDepreciationToDate || '0')
      const openingBalance = adjustedCost - totalDepToDate

      // Type guard to ensure valid depreciation method
      const depreciationMethod = asset.depreciationMethod as
        | 'straight_line'
        | 'reducing_balance'

      const periodDepreciation = calculatePeriodDepreciation({
        cost: parseFloat(asset.cost),
        adjustment: parseFloat(asset.adjustment || '0'),
        depreciationRate: parseFloat(asset.depreciationRate),
        method: depreciationMethod,
        periodStartDate: new Date(period.startDate),
        periodEndDate: new Date(period.endDate),
        purchaseDate: new Date(asset.dateOfPurchase),
        totalDepreciationToDate: totalDepToDate
      })

      const closingBalance = openingBalance - periodDepreciation

      const daysInPeriod = calculateDaysInPeriod(
        new Date(period.startDate),
        new Date(period.endDate),
        new Date(asset.dateOfPurchase)
      )

      entries.push({
        assetId: asset.id,
        periodId: period.id,
        openingBalance: openingBalance.toFixed(2),
        depreciationAmount: periodDepreciation.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
        daysInPeriod,
        depreciationMethod: depreciationMethod,
        rateUsed: asset.depreciationRate
      })
    }

    // Insert all entries (or update if they exist)
    for (const entry of entries) {
      await db
        .insert(depreciationEntries)
        .values(entry)
        .onConflictDoUpdate({
          target: [depreciationEntries.assetId, depreciationEntries.periodId],
          set: {
            depreciationAmount: entry.depreciationAmount,
            closingBalance: entry.closingBalance,
            openingBalance: entry.openingBalance,
            daysInPeriod: entry.daysInPeriod
          }
        })
    }

    revalidatePath('/fixed-assets/periods')
    return { success: true, entriesCreated: entries.length }
  } catch (error) {
    console.error('Error calculating period depreciation:', error)
    return { success: false, error: 'Failed to calculate depreciation' }
  }
}

export async function closePeriod(periodId: string) {
  try {
    // Mark period as closed
    await db
      .update(accountingPeriodsTable)
      .set({ isOpen: false })
      .where(eq(accountingPeriodsTable.id, periodId))

    // Update totalDepreciationToDate for all assets
    const entries = await db
      .select()
      .from(depreciationEntries)
      .where(eq(depreciationEntries.periodId, periodId))

    for (const entry of entries) {
      await db
        .update(fixedAssets)
        .set({
          totalDepreciationToDate: sql`${fixedAssets.totalDepreciationToDate} + ${entry.depreciationAmount}`
        })
        .where(eq(fixedAssets.id, entry.assetId))
    }

    revalidatePath('/fixed-assets/periods')
    revalidatePath('/fixed-assets')
    return { success: true }
  } catch (error) {
    console.error('Error closing period:', error)
    return { success: false, error: 'Failed to close period' }
  }
}

export async function getAccountingPeriodById(periodId: string) {
  try {
    const accountingPeriodById = await db.query.accountingPeriods.findFirst({
      where: eq(accountingPeriodsTable.id, periodId)
    })

    return accountingPeriodById
  } catch (error) {
    console.error(error)
    return null
  }
}
