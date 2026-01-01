'use server'

import { db } from '@/db'
import { costCentres as costCentresTable } from '@/db/schema'

import { getUISession } from '@/lib/get-ui-session'
import { actionClient } from '@/lib/safe-action'

import {
  CostCentreFormValues,
  costCentreFormSchema
} from '@/zod-schemas/costCentre'

import { asc, eq, and } from 'drizzle-orm'
import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'

export type CostCentreServer = {
  id: string
  name: string
  organizationId: string // directly included from organisation
}
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
  .inputSchema(costCentreFormSchema, {
    handleValidationErrorsShape: async ve =>
      flattenValidationErrors(ve).fieldErrors
  })
  .action(
    async ({
      parsedInput: costCentre
    }: {
      parsedInput: CostCentreFormValues
    }) => {
      console.log('--- saveCostCentreAction called ---')
      console.log('Incoming costCentre:', costCentre)

      const trimmedCostCentre = {
        ...costCentre,
        name: costCentre.name.trim(),
        organizationId: costCentre.organizationId
      }

      console.log('Trimmed costCentre:', trimmedCostCentre)
      /* ------------------------ AUTHENTICATION CHECK ------------------------ */
      // 1️⃣ Get session + UI permissions
      const { user, ui } = await getUISession()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // 2️⃣ Enforce org-level admin access
      if (!ui.canAccessAdmin) {
        throw new Error('Forbidden: Admin access required')
      }

      /* ----------------------------- DUPLICATE CHECK ----------------------------- */
      const duplicates = await existingCostCentre(
        costCentre.name,
        costCentre.organizationId
      )

      // Editing: allow duplicate if it is THIS record

      const isEditing = Boolean(costCentre.id)
      // Works for:
      //undefined → false (create)
      //real id → true (edit)
      if (duplicates.length > 0) {
        const isSameRecord = isEditing && duplicates[0].id === costCentre.id

        if (!isSameRecord) {
          throw new Error('Cost centre already exists')
        }
      }

      // Normalized payload for Drizzle
      const normalized = {
        name: trimmedCostCentre.name,
        organizationId: trimmedCostCentre.organizationId
      } as const

      /* ---------------------------------- CREATE ---------------------------------- */
      if (!isEditing) {
        const [inserted] = await db
          .insert(costCentresTable)
          .values(normalized)
          .returning({ insertedId: costCentresTable.id })

        revalidatePath('/costCentres')

        return {
          message: `Cost centre created successfully`,
          success: true,
          costCentreId: inserted.insertedId
        }
      }

      /* ---------------------------------- UPDATE ---------------------------------- */
      // ---- UPDATE ----
      const [updated] = await db
        .update(costCentresTable)
        .set(normalized)
        .where(eq(costCentresTable.id, trimmedCostCentre.id!))
        .returning({ updatedId: costCentresTable.id })

      // console.log('Updated cost center:', updated)
      revalidatePath('/costCentres')

      return {
        success: true,
        message: `Cost centre updated successfully`,
        costCentreId: updated.updatedId
      }
    }
  )
