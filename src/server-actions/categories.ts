'use server'

import { db } from '@/db'
import { categories } from '@/db/schema'

import { auth } from '@/lib/auth'
import { actionClient } from '@/lib/safe-action'
import {
  insertCategorySchema,
  insertCategorySchemaType
} from '@/zod-schemas/categories'

import { and, asc, eq } from 'drizzle-orm'

import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getCategoriesByUserId(userId: string) {
  const CategoriesByUserId = await db
    .select({
      id: categories.id,
      name: categories.name,
      userId: categories.userId
    })
    .from(categories)
    .where(and(eq(categories.userId, userId)))
    .orderBy(asc(categories.name))

  return CategoriesByUserId
}

export const existingCategory = async (name: string, userId: string) => {
  try {
    return db
      .select()
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.userId, userId)))
  } catch {
    return { success: false, message: 'Failed to create category' }
  }
}

export const deleteCategory = async (id: number, path: string) => {
  try {
    await db.delete(categories).where(eq(categories.id, id))
    revalidatePath(path)
    return { success: true, message: 'Category deleted successfully' }
  } catch {
    return { success: false, message: 'Failed to delete category' }
  }
}

//use-safe-actions

export const saveCategoryAction = actionClient
  .metadata({ actionName: 'saveCategoryAction' })
  .inputSchema(insertCategorySchema, {
    handleValidationErrorsShape: async ve =>
      flattenValidationErrors(ve).fieldErrors
  })
  .action(
    async ({
      parsedInput: category
    }: {
      parsedInput: insertCategorySchemaType
    }) => {
      const session = await auth.api.getSession({
        headers: await headers()
      })

      if (!session) redirect('/auth/sign-in')

      if (!session?.user || session.user.role !== 'admin') {
        throw new Error('You must be an admin to add/access this data')
      }

      // ERROR TESTS

      // throw Error('test error client create action')

      // New Category

      // createdAt and updatedAt are set by the database
      // Check if category already exists
      const duplicatedCategory = await existingCategory(
        category.name,
        category.userId
      )

      // duplicatedCategory returns an array. If it is empty we want to convert the empty array to a string. We then make sure the array is zero so that the create function will work
      const dupCat = duplicatedCategory.toString()

      if (dupCat.length > 0) {
        // next-safe-action lets you throw a typed error
        throw new Error('Category already exists')
      }

      if (category.id === 0) {
        const result = await db

          .insert(categories)
          .values({
            name: category.name,
            userId: category.userId
          })
          .returning({ insertedId: categories.id })

        return {
          message: `Client ID #${result[0].insertedId} created successfully`
        }
      }

      // Existing category
      // updatedAt is set by the database
      const result = await db
        .update(categories)
        .set({
          name: category.name,
          userId: category.userId
        })
        // ! confirms category.id will always exist for the update function
        .where(eq(categories.id, category.id!))
        .returning({ updatedId: categories.id })

      return {
        message: `Client ID #${result[0].updatedId} updated successfully`
      }
    }
  )
