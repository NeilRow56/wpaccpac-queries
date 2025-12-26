// app/actions/category-actions.ts
'use server'

import { revalidatePath } from 'next/cache'

import { eq } from 'drizzle-orm'
import { assetCategories } from '@/db/schema'
import { db } from '@/db'

export async function createCategory(data: {
  name: string
  clientId: string
  description?: string
  defaultDepreciationRate?: string
}) {
  try {
    await db.insert(assetCategories).values({
      name: data.name,
      clientId: data.clientId,
      description: data.description || null,
      defaultDepreciationRate: data.defaultDepreciationRate || null
    })

    revalidatePath('/fixed-assets/categories')
    return { success: true }
  } catch (error) {
    console.error('Error creating category:', error)
    return { success: false, error: 'Failed to create category' }
  }
}

export async function updateCategory(data: {
  id: string
  name: string
  description?: string
  defaultDepreciationRate?: string
}) {
  try {
    await db
      .update(assetCategories)
      .set({
        name: data.name,
        description: data.description || null,
        defaultDepreciationRate: data.defaultDepreciationRate || null
      })
      .where(eq(assetCategories.id, data.id))

    revalidatePath('/fixed-assets/categories')
    return { success: true }
  } catch (error) {
    console.error('Error updating category:', error)
    return { success: false, error: 'Failed to update category' }
  }
}

export async function deleteCategory(id: string) {
  try {
    // Check if category has any assets
    // If needed, add a check here

    await db.delete(assetCategories).where(eq(assetCategories.id, id))

    revalidatePath('/fixed-assets/categories')
    return { success: true }
  } catch (error) {
    console.error('Error deleting category:', error)
    return {
      success: false,
      error: 'Failed to delete category. It may have assets assigned to it.'
    }
  }
}
