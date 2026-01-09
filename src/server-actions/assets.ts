// app/actions/asset-actions.ts
'use server'

import { db } from '@/db'
import {
  accountingPeriods,
  assetPeriodBalances,
  fixedAssets,
  fixedAssets as fixedAssetsTable
} from '@/db/schema'
import {
  CreateHistoricAssetInput,
  createHistoricAssetSchema
} from '@/zod-schemas/fixedAssets'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function createAsset(data: {
  name: string
  clientId: string
  categoryId: string
  description?: string
  originalCost: string
  acquisitionDate: string
  costAdjustment: string
  depreciationMethod: 'straight_line' | 'reducing_balance'
  // depreciationAdjustment: string
  depreciationRate: string
  totalDepreciationToDate?: string
  // disposalValue?: string
}) {
  try {
    await db.insert(fixedAssetsTable).values([
      {
        name: data.name,
        clientId: data.clientId,
        categoryId: data.categoryId,
        description: data.description ?? null,
        originalCost: data.originalCost,
        acquisitionDate: data.acquisitionDate,
        costAdjustment: data.costAdjustment ?? '0',
        // depreciationAdjustment: data.depreciationAdjustment ?? '0',
        depreciationMethod: data.depreciationMethod,
        depreciationRate: data.depreciationRate,
        totalDepreciationToDate: data.totalDepreciationToDate ?? '0'
        // disposalValue: data.disposalValue ?? null
      }
    ])

    revalidatePath('/fixed-assets')
    return { success: true }
  } catch (error) {
    console.error('Error creating asset:', error)
    return { success: false, error: 'Failed to create asset' }
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
  totalDepreciationToDate?: string
}) {
  try {
    await db
      .update(fixedAssetsTable)
      .set({
        name: data.name,
        clientId: data.clientId,
        ...(data.categoryId !== undefined && {
          categoryId: data.categoryId
        }),
        description: data.description ?? null,
        originalCost: data.originalCost,
        acquisitionDate: data.acquisitionDate,
        costAdjustment: data.costAdjustment ?? '0',
        depreciationMethod: data.depreciationMethod,

        depreciationRate: data.depreciationRate,
        totalDepreciationToDate: data.totalDepreciationToDate ?? '0'
      })
      .where(eq(fixedAssetsTable.id, data.id))

    revalidatePath('/fixed-assets')
    return { success: true }
  } catch (error) {
    console.error('Error updating asset:', error)
    return { success: false, error: 'Failed to update asset' }
  }
}

export async function deleteAsset(id: string) {
  try {
    await db.delete(fixedAssetsTable).where(eq(fixedAssetsTable.id, id))

    revalidatePath('/fixed-assets')
    return { success: true }
  } catch (error) {
    console.error('Error deleting asset:', error)
    return { success: false, error: 'Failed to delete asset' }
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
    if (!period.isOpen || !period.isCurrent) {
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
