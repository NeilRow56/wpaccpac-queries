'use server'

import { db } from '@/db'
import { clientCategories } from '@/db/schema'
import { auth } from '@/lib/auth'
import { actionClient } from '@/lib/safe-action'
import {
  insertClientCategorySchema,
  insertClientCategorySchemaType
} from '@/zod-schemas/clientCategories'
import { and, asc, eq } from 'drizzle-orm'
import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getActiveOrganizationClientCategories(
  organizationId: string
) {
  const categoriesByOrganizationId = await db
    .select({
      id: clientCategories.id,
      name: clientCategories.name,
      organizationId: clientCategories.organizationId
    })
    .from(clientCategories)
    .where(and(eq(clientCategories.organizationId, organizationId)))
    .orderBy(asc(clientCategories.name))

  return categoriesByOrganizationId
}

export const existingClientCategory = async (
  name: string,
  organizationId: string
) => {
  try {
    return db
      .select()
      .from(clientCategories)
      .where(
        and(
          eq(clientCategories.name, name),
          eq(clientCategories.organizationId, organizationId)
        )
      )
  } catch {
    return { success: false, message: 'Failed to create category' }
  }
}

export const deleteClientCategory = async (id: string, path: string) => {
  try {
    await db.delete(clientCategories).where(eq(clientCategories.id, id))
    revalidatePath(path)
    return { success: true, message: 'Category deleted successfully' }
  } catch {
    return { success: false, message: 'Failed to delete category' }
  }
}

//use-safe-actions

export const saveClientCategoryAction = actionClient
  .metadata({ actionName: 'saveClientCategoryAction' })
  .inputSchema(insertClientCategorySchema, {
    handleValidationErrorsShape: async ve =>
      flattenValidationErrors(ve).fieldErrors
  })
  .action(
    async ({
      parsedInput: clientCategory
    }: {
      parsedInput: insertClientCategorySchemaType
    }) => {
      const session = await auth.api.getSession({
        headers: await headers()
      })

      if (!session) redirect('/auth')

      if (!session?.user || session.user.role !== 'admin') {
        throw new Error('You must be an admin to add/access this data')
      }

      // ERROR TESTS

      // throw Error('test error client create action')

      // New Category

      // createdAt and updatedAt are set by the database
      // Check if category already exists
      const duplicatedCategory = await existingClientCategory(
        clientCategory.name,
        clientCategory.organizationId
      )

      // duplicatedCategory returns an array. If it is empty we want to convert the empty array to a string. We then make sure the array is zero so that the create function will work
      const dupCat = duplicatedCategory.toString()

      if (dupCat.length > 0) {
        // next-safe-action lets you throw a typed error
        throw new Error('Category already exists')
      }

      if (clientCategory.id === '') {
        const result = await db

          .insert(clientCategories)
          .values({
            name: clientCategory.name,
            organizationId: clientCategory.organizationId
          })
          .returning({ insertedId: clientCategories.id })

        return {
          message: `Client category ID #${result[0].insertedId} created successfully`
        }
      }

      // Existing category
      // updatedAt is set by the database
      const result = await db
        .update(clientCategories)
        .set({
          name: clientCategory.name,
          organizationId: clientCategory.organizationId
        })
        // ! confirms category.id will always exist for the update function
        .where(eq(clientCategories.id, clientCategory.id!))
        .returning({ updatedId: clientCategories.id })

      return {
        message: `Client category ID #${result[0].updatedId} updated successfully`
      }
    }
  )
