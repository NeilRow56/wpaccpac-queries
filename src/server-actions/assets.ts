// app/actions/asset-actions.ts
'use server'

import { db } from '@/db'
import {
  accountingPeriods,
  assetMovements,
  assetPeriodBalances,
  depreciationEntries,
  fixedAssets,
  fixedAssets as fixedAssetsTable
} from '@/db/schema'
import {
  CreateHistoricAssetInput,
  createHistoricAssetSchema
} from '@/zod-schemas/fixedAssets'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

type DepMethod = 'straight_line' | 'reducing_balance'

function isYmdWithinPeriod(ymd: string, startYmd: string, endYmd: string) {
  // YYYY-MM-DD string compare is safe
  return ymd >= startYmd && ymd <= endYmd
}

export async function createAsset(data: {
  name: string
  clientId: string
  categoryId: string
  description?: string
  originalCost: string
  acquisitionDate: string // YYYY-MM-DD
  costAdjustment: string
  depreciationMethod: DepMethod
  depreciationRate: string
}) {
  try {
    // 0) Get current open period FIRST (needed both for validation + seeding)
    const period = await db.query.accountingPeriods.findFirst({
      where: and(
        eq(accountingPeriods.clientId, data.clientId),
        eq(accountingPeriods.isCurrent, true),
        eq(accountingPeriods.status, 'OPEN')
      )
    })

    if (!period) {
      return {
        success: false as const,
        error:
          'No current open accounting period found. Create/open a period before adding assets.'
      }
    }

    // ✅ Guard: acquisition date must be within current open period
    if (
      !isYmdWithinPeriod(data.acquisitionDate, period.startDate, period.endDate)
    ) {
      return {
        success: false as const,
        error: `Purchase date must be within the current period (${period.startDate} to ${period.endDate}).`
      }
    }

    // 1) Create asset (master record) and get id
    const inserted = await db
      .insert(fixedAssetsTable)
      .values({
        name: data.name,
        clientId: data.clientId,
        categoryId: data.categoryId,
        description: data.description ?? null,
        originalCost: data.originalCost,
        acquisitionDate: data.acquisitionDate,
        costAdjustment: data.costAdjustment ?? '0',
        depreciationMethod: data.depreciationMethod,
        depreciationRate: data.depreciationRate
      })
      .returning({ id: fixedAssetsTable.id })

    const assetId = inserted[0]?.id
    if (!assetId) {
      return { success: false as const, error: 'Failed to create asset' }
    }

    // 2) Seed balances for the current open period
    const originalCostNum = Number(data.originalCost ?? 0)
    const costAdjNum = Number(data.costAdjustment ?? '0')
    const adjustedCost = (originalCostNum + costAdjNum).toFixed(2)

    // Since we now require acquisitionDate to be within the period,
    // acquiredBeforePeriod will always be false.
    // Kept here for safety/future rule changes.
    const acquiredBeforePeriod = data.acquisitionDate < period.startDate

    await db
      .insert(assetPeriodBalances)
      .values({
        assetId,
        periodId: period.id,

        costBfwd: acquiredBeforePeriod ? adjustedCost : '0',
        additions: acquiredBeforePeriod ? '0' : originalCostNum.toFixed(2),
        depreciationBfwd: '0'
      })
      .onConflictDoNothing({
        target: [assetPeriodBalances.assetId, assetPeriodBalances.periodId]
      })

    revalidatePath(`/organisation/clients/${data.clientId}/fixed-assets`)
    return { success: true as const, assetId }
  } catch (error) {
    console.error('Error creating asset:', error)
    return { success: false as const, error: 'Failed to create asset' }
  }
}

export async function updateAsset(data: {
  id: string
  name: string
  clientId: string
  categoryId?: string
  description?: string
  originalCost: string
  acquisitionDate: string
  costAdjustment?: string
  depreciationMethod: 'straight_line' | 'reducing_balance'
  depreciationRate: string
}) {
  try {
    // 0) Load current stored acquisitionDate (so we can detect change)
    const existing = await db
      .select({
        acquisitionDate: fixedAssetsTable.acquisitionDate
      })
      .from(fixedAssetsTable)
      .where(eq(fixedAssetsTable.id, data.id))
      .then(rows => rows[0])

    if (!existing) {
      return { success: false as const, error: 'Asset not found' }
    }

    // 1) Does this asset have period history?
    const hasHistory = await db
      .select({ id: assetPeriodBalances.id })
      .from(assetPeriodBalances)
      .where(eq(assetPeriodBalances.assetId, data.id))
      .limit(1)
      .then(rows => rows.length > 0)

    // ✅ OPTION B: Lock acquisitionDate once the asset has history
    if (hasHistory && data.acquisitionDate !== existing.acquisitionDate) {
      return {
        success: false as const,
        error: 'Purchase date is locked once an asset has period history. '
      }
    }

    // 2) Only enforce "within current open period" when there's NO history yet
    if (!hasHistory) {
      const period = await db.query.accountingPeriods.findFirst({
        where: and(
          eq(accountingPeriods.clientId, data.clientId),
          eq(accountingPeriods.isCurrent, true),
          eq(accountingPeriods.status, 'OPEN')
        )
      })

      if (!period) {
        return {
          success: false as const,
          error:
            'No current open accounting period found. Create/open a period before updating assets.'
        }
      }

      // YYYY-MM-DD string compare is safe
      if (
        data.acquisitionDate < period.startDate ||
        data.acquisitionDate > period.endDate
      ) {
        return {
          success: false as const,
          error: `Purchase date must be within the current period (${period.startDate} to ${period.endDate}).`
        }
      }
    }

    // 3) Perform update (date will be unchanged for history assets)
    await db
      .update(fixedAssetsTable)
      .set({
        name: data.name,
        clientId: data.clientId,
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        description: data.description ?? null,
        originalCost: data.originalCost,
        acquisitionDate: data.acquisitionDate,
        costAdjustment: data.costAdjustment ?? '0',
        depreciationMethod: data.depreciationMethod,
        depreciationRate: data.depreciationRate
      })
      .where(eq(fixedAssetsTable.id, data.id))

    revalidatePath(`/organisation/clients/${data.clientId}/fixed-assets`)
    return { success: true as const }
  } catch (error) {
    console.error('Error updating asset:', error)
    return { success: false as const, error: 'Failed to update asset' }
  }
}

export async function deleteAsset(params: { id: string; clientId: string }) {
  try {
    const { id: assetId, clientId } = params

    const asset = await db
      .select({ id: fixedAssets.id })
      .from(fixedAssets)
      .where(
        and(eq(fixedAssets.id, assetId), eq(fixedAssets.clientId, clientId))
      )
      .then(r => r[0])

    if (!asset) {
      return {
        success: false as const,
        error: 'Asset not found for this client.'
      }
    }

    // 1) Any depreciation entries? (posted depreciation exists)
    const hasDepEntries = await db
      .select({ id: depreciationEntries.id })
      .from(depreciationEntries)
      .where(eq(depreciationEntries.assetId, assetId))
      .limit(1)
      .then(r => r.length > 0)

    if (hasDepEntries) {
      return {
        success: false as const,
        error: 'This asset has posted depreciation and cannot be deleted.'
      }
    }

    // 2) Any movements? (audit trail exists)
    const hasMovements = await db
      .select({ id: assetMovements.id })
      .from(assetMovements)
      .where(eq(assetMovements.assetId, assetId))
      .limit(1)
      .then(r => r.length > 0)

    if (hasMovements) {
      return {
        success: false as const,
        error: 'This asset has movements posted and cannot be deleted.'
      }
    }

    // 3) Any balances in closed periods?
    const balances = await db
      .select({ periodId: assetPeriodBalances.periodId })
      .from(assetPeriodBalances)
      .where(eq(assetPeriodBalances.assetId, assetId))

    if (balances.length > 0) {
      const periodIds = balances.map(b => b.periodId)

      const closedHit = await db
        .select({ id: accountingPeriods.id })
        .from(accountingPeriods)
        .where(
          and(
            eq(accountingPeriods.clientId, clientId),
            eq(accountingPeriods.status, 'CLOSED'),
            inArray(accountingPeriods.id, periodIds)
          )
        )
        .limit(1)
        .then(r => r.length > 0)

      if (closedHit) {
        return {
          success: false as const,
          error:
            'This asset exists in a closed period and cannot be deleted. Use disposal/reversal instead.'
        }
      }
    }

    // ✅ If we reach here, safe to delete
    await db
      .delete(fixedAssets)
      .where(
        and(eq(fixedAssets.id, assetId), eq(fixedAssets.clientId, clientId))
      )

    revalidatePath(`/organisation/clients/${clientId}/fixed-assets`)
    revalidatePath(`/organisation/clients/${clientId}/accounting-periods`)

    return { success: true as const }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to delete asset'
    return { success: false as const, error: message }
  }
}

export async function createHistoricAsset(input: unknown) {
  const parsed = createHistoricAssetSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() }
  }

  const data: CreateHistoricAssetInput = parsed.data

  return await db.transaction(async tx => {
    const period = await tx.query.accountingPeriods.findFirst({
      where: and(
        eq(accountingPeriods.id, data.periodId),
        eq(accountingPeriods.clientId, data.clientId)
      )
    })

    if (!period) throw new Error('Period not found')
    if (period.status !== 'OPEN' || !period.isCurrent) {
      throw new Error(
        'Historic assets can only be added to the current open period'
      )
    }

    const periodStart = new Date(period.startDate)
    const acquisitionDate = new Date(data.acquisitionDate)

    // Strong UX rule for “historic”: must be before period start
    if (!(acquisitionDate < periodStart)) {
      throw new Error(
        'Historic assets must have an acquisition date before the current period start'
      )
    }

    const originalCostNum = Number(data.originalCost)
    const costAdjNum = Number(data.costAdjustment ?? '0')
    const openingDepNum = Number(data.openingAccumulatedDepreciation)

    const adjustedCost = originalCostNum + costAdjNum

    if (openingDepNum < 0)
      throw new Error('Opening accumulated depreciation cannot be negative')
    if (openingDepNum > adjustedCost)
      throw new Error('Opening accumulated depreciation cannot exceed cost')

    // 1) Create asset (master record)
    const inserted = await tx
      .insert(fixedAssets)
      .values({
        clientId: data.clientId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description ?? null,

        // fixedAssets.acquisitionDate is a `date` column -> string YYYY-MM-DD is OK
        acquisitionDate: data.acquisitionDate,

        // decimals can be inserted as strings
        originalCost: originalCostNum.toFixed(2),
        costAdjustment: costAdjNum.toFixed(2),

        depreciationMethod: data.depreciationMethod,
        depreciationRate: Number(data.depreciationRate).toFixed(2),

        // Keep “to date” out of the asset master if you’re going full Option B
        totalDepreciationToDate: '0'
      })
      .returning({ id: fixedAssets.id })

    const assetId = inserted[0]?.id
    if (!assetId) throw new Error('Failed to create asset')

    // 2) Opening balances row for the current period
    await tx
      .insert(assetPeriodBalances)
      .values({
        assetId,
        periodId: data.periodId,

        costBfwd: adjustedCost.toFixed(2),
        additions: '0',
        disposalsCost: '0',
        costAdjustment: '0',

        depreciationBfwd: openingDepNum.toFixed(2),
        depreciationCharge: '0',
        depreciationOnDisposals: '0',
        depreciationAdjustment: '0'
      })
      .onConflictDoUpdate({
        target: [assetPeriodBalances.assetId, assetPeriodBalances.periodId],
        set: {
          costBfwd: adjustedCost.toFixed(2),
          depreciationBfwd: openingDepNum.toFixed(2)
        }
      })

    return { success: true as const, assetId }
  })
}
