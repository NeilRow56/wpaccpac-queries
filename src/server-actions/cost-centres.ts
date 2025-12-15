'use server'

import { db } from '@/db'
import { costCentres as costCentresTable } from '@/db/schema'
import { auth } from '@/lib/auth'
import { actionClient } from '@/lib/safe-action'

import {
  insertCostCentreSchema,
  insertCostCentreSchemaType
} from '@/zod-schemas/costCentre'

import { asc, eq, and } from 'drizzle-orm'
import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

/* -------------------------------------------------------------------------- */
/*                               QUERY FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

/**
 * Get all cost centres for an organisation—ordered by name.
 */
export async function getActiveOrganizationCostCentres(organizationId: string) {
  return await db.query.costCentres.findMany({
    where: eq(costCentresTable.organizationId, organizationId),
    orderBy: asc(costCentresTable.name)
  })
}

/**
 * Check if cost centre exists (returns row array).
 */
export async function existingCostCentre(name: string, organizationId: string) {
  return await db
    .select()
    .from(costCentresTable)
    .where(
      and(
        eq(costCentresTable.name, name),
        eq(costCentresTable.organizationId, organizationId)
      )
    )
}

/**
 * Delete a cost centre (non-safe-action mutation).
 */
export async function deleteCostCentre(id: string, path: string) {
  try {
    await db.delete(costCentresTable).where(eq(costCentresTable.id, id))
    revalidatePath(path)
    return { success: true, message: 'Cost centre deleted successfully' }
  } catch {
    return { success: false, message: 'Failed to delete cost centre' }
  }
}

/* -------------------------------------------------------------------------- */
/*                                SAFE ACTIONS                                */
/* -------------------------------------------------------------------------- */

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
      /* ------------------------ AUTHENTICATION CHECK ------------------------ */
      const session = await auth.api.getSession({
        headers: await headers()
      })

      if (!session) redirect('/auth')

      if (!session.user || session.user.role !== 'admin') {
        throw new Error('You must be an administrator to add/access this data')
      }

      /* ----------------------------- DUPLICATE CHECK ----------------------------- */
      const duplicates = await existingCostCentre(
        costCentre.name,
        costCentre.organizationId
      )

      // Editing: allow duplicate if it is THIS record
      const isEditing = costCentre.id !== ''
      if (duplicates.length > 0) {
        const isSameRecord = isEditing && duplicates[0].id === costCentre.id

        if (!isSameRecord) {
          throw new Error('Cost centre already exists')
        }
      }

      /* ---------------------------------- CREATE ---------------------------------- */
      if (!isEditing) {
        const result = await db
          .insert(costCentresTable)
          .values({
            name: costCentre.name,
            organizationId: costCentre.organizationId
          })
          .returning({ insertedId: costCentresTable.id })

        return {
          message: `Cost centre #${result[0].insertedId} created successfully`
        }
      }

      /* ---------------------------------- UPDATE ---------------------------------- */
      const result = await db
        .update(costCentresTable)
        .set({
          name: costCentre.name,
          organizationId: costCentre.organizationId
        })
        .where(eq(costCentresTable.id, costCentre.id!))
        .returning({ updatedId: costCentresTable.id })

      return {
        message: `Cost centre #${result[0].updatedId} updated successfully`
      }
    }
  )
