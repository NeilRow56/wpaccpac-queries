// app/actions/asset-actions.ts
'use server'

import { db } from '@/db'
import { fixedAssets as fixedAssetsTable } from '@/db/schema'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function createAsset(data: {
  name: string
  clientId: string
  categoryId: string
  description?: string
  cost: string
  dateOfPurchase: string
  costAdjustment: string
  depreciationMethod: 'straight_line' | 'reducing_balance'
  depreciationAdjustment: string
  depreciationRate: string
  totalDepreciationToDate?: string
  disposalValue?: string
}) {
  try {
    await db.insert(fixedAssetsTable).values([
      {
        name: data.name,
        clientId: data.clientId,
        categoryId: data.categoryId,
        description: data.description ?? null,
        cost: data.cost,
        dateOfPurchase: data.dateOfPurchase,
        costAdjustment: data.costAdjustment ?? '0',
        depreciationAdjustment: data.depreciationAdjustment ?? '0',
        depreciationMethod: data.depreciationMethod,
        depreciationRate: data.depreciationRate,
        totalDepreciationToDate: data.totalDepreciationToDate ?? '0',
        disposalValue: data.disposalValue ?? null
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
  cost: string
  dateOfPurchase: string
  costAdjustment?: string
  depreciationMethod: 'straight_line' | 'reducing_balance'
  depreciationAdjustment: string
  depreciationRate: string
  totalDepreciationToDate?: string
  disposalValue?: string
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
        cost: data.cost,
        dateOfPurchase: data.dateOfPurchase,
        costAdjustment: data.costAdjustment ?? '0',
        depreciationMethod: data.depreciationMethod,
        depreciationAdjustment: data.depreciationAdjustment ?? '0',
        depreciationRate: data.depreciationRate,
        totalDepreciationToDate: data.totalDepreciationToDate ?? '0',
        disposalValue: data.disposalValue ?? null
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
