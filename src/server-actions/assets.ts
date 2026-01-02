// app/actions/asset-actions.ts
'use server'

import { revalidatePath } from 'next/cache'

import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { fixedAssets } from '@/db/schema'

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
    await db.insert(fixedAssets).values({
      name: data.name,
      clientId: data.clientId,
      categoryId: data.categoryId,
      description: data.description || null,
      cost: data.cost,
      dateOfPurchase: data.dateOfPurchase,
      costAdjustment: data.costAdjustment || '0',
      depreciationAdjustment: data.depreciationAdjustment || '0',
      depreciationMethod: data.depreciationMethod,
      depreciationRate: data.depreciationRate,
      totalDepreciationToDate: data.totalDepreciationToDate || '0',
      disposalValue: data.disposalValue || null
    })

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
      .update(fixedAssets)
      .set({
        name: data.name,
        clientId: data.clientId,
        categoryId: data.categoryId,
        description: data.description || null,
        cost: data.cost,
        dateOfPurchase: data.dateOfPurchase,
        costAdjustment: data.costAdjustment || '0',
        depreciationMethod: data.depreciationMethod,
        depreciationAdjustment: data.depreciationAdjustment || '0',
        depreciationRate: data.depreciationRate,
        totalDepreciationToDate: data.totalDepreciationToDate || '0',
        disposalValue: data.disposalValue || null
      })
      .where(eq(fixedAssets.id, data.id))

    revalidatePath('/fixed-assets')
    return { success: true }
  } catch (error) {
    console.error('Error updating asset:', error)
    return { success: false, error: 'Failed to update asset' }
  }
}

export async function deleteAsset(id: string) {
  try {
    await db.delete(fixedAssets).where(eq(fixedAssets.id, id))

    revalidatePath('/fixed-assets')
    return { success: true }
  } catch (error) {
    console.error('Error deleting asset:', error)
    return { success: false, error: 'Failed to delete asset' }
  }
}
