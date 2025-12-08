'use server'

import { db } from '@/db'
import { costCentres } from '@/db/schema'
import { auth } from '@/lib/auth'
import { actionClient } from '@/lib/safe-action'

import {
  insertCostCentreSchema,
  insertCostCentreSchemaType
} from '@/zod-schemas/costCentre'
import { and, asc, eq } from 'drizzle-orm'
import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getActiveOrganizationCostCentres(organizationId: string) {
  const costCentresByOrganizationId = await db
    .select({
      id: costCentres.id,
      name: costCentres.name,
      organizationId: costCentres.organizationId
    })
    .from(costCentres)
    .where(and(eq(costCentres.organizationId, organizationId)))
    .orderBy(asc(costCentres.name))

  return costCentresByOrganizationId
}

export const existingCostCentre = async (
  name: string,
  organizationId: string
) => {
  try {
    return db
      .select()
      .from(costCentres)
      .where(
        and(
          eq(costCentres.name, name),
          eq(costCentres.organizationId, organizationId)
        )
      )
  } catch {
    return {
      success: false,
      message: 'Failed to create cost centre. This may already exist'
    }
  }
}

export const deleteCostCentre = async (id: string, path: string) => {
  try {
    await db.delete(costCentres).where(eq(costCentres.id, id))
    revalidatePath(path)
    return { success: true, message: 'Cost centre deleted successfully' }
  } catch {
    return { success: false, message: 'Failed to delete cost centre' }
  }
}

//use-safe-actions

export const saveCostCentreAction = actionClient
  .metadata({ actionName: 'saveCostCentreAction' })
  .inputSchema(insertCostCentreSchema, {
    handleValidationErrorsShape: async ve =>
      flattenValidationErrors(ve).fieldErrors
  })
  .action(
    async ({
      parsedInput: costCentre
    }: {
      parsedInput: insertCostCentreSchemaType
    }) => {
      const session = await auth.api.getSession({
        headers: await headers()
      })

      if (!session) redirect('/auth')

      if (!session?.user || session.user.role !== 'admin') {
        throw new Error(
          'You must be an admininistrator to add/access this data'
        )
      }

      // ERROR TESTS

      // throw Error('test error client create action')

      // New Category

      // createdAt and updatedAt are set by the database
      // Check if category already exists
      const duplicatedCostCentre = await existingCostCentre(
        costCentre.name,
        costCentre.organizationId
      )

      // duplicatedCategory returns an array. If it is empty we want to convert the empty array to a string. We then make sure the array is zero so that the create function will work
      const dupCat = duplicatedCostCentre.toString()

      if (dupCat.length > 0) {
        // next-safe-action lets you throw a typed error
        throw new Error('Cost centre already exists')
      }

      if (costCentre.id === '') {
        const result = await db

          .insert(costCentres)
          .values({
            name: costCentre.name,
            organizationId: costCentre.organizationId
          })
          .returning({ insertedId: costCentres.id })

        return {
          message: `Cost centre ID #${result[0].insertedId} created successfully`
        }
      }

      // Existing cost centre
      // updatedAt is set by the database
      const result = await db
        .update(costCentres)
        .set({
          name: costCentre.name,
          organizationId: costCentre.organizationId
        })
        // ! confirms costCentres.id will always exist for the update function
        .where(eq(costCentres.id, costCentre.id!))
        .returning({ updatedId: costCentres.id })

      return {
        message: `Cost centre ID #${result[0].updatedId} updated successfully`
      }
    }
  )
