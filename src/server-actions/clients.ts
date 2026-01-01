'use server'

import { db } from '@/db'
import { clients as clientsTable, costCentres } from '@/db/schema'

import { getUISession } from '@/lib/get-ui-session'
import { actionClient } from '@/lib/safe-action'
import { clientFormSchema, ClientFormValues } from '@/zod-schemas/clients'
import { asc, eq } from 'drizzle-orm'

import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'

export type ClientServer = {
  id: string
  name: string
  entity_type: string
  costCentreId: string | null
  costCentreName: string | null // directly included from cost_centres
  organizationId: string
  notes: string | null
  active: boolean
}
export async function getActiveOrganizationClients(
  organizationId: string
): Promise<ClientServer[]> {
  const { user } = await getUISession()

  if (!user) {
    throw new Error('Not authenticated')
  }
  const clientsWithCostCentre = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      entity_type: clientsTable.entity_type,
      costCentreId: clientsTable.costCentreId,
      costCentreName: costCentres.name, // join to get name
      organizationId: clientsTable.organizationId,
      notes: clientsTable.notes,
      active: clientsTable.active
    })
    .from(clientsTable)
    .leftJoin(costCentres, eq(clientsTable.costCentreId, costCentres.id))
    .where(eq(clientsTable.organizationId, organizationId))
    .orderBy(asc(clientsTable.name))

  return clientsWithCostCentre
}
/**
 * Delete a client
 */
export async function deleteClient(id: string) {
  const { user, ui } = await getUISession()

  if (!user) {
    return { success: false, message: 'Not authenticated' }
  }

  if (!ui.canAccessAdmin) {
    return {
      success: false,
      message: 'You are not allowed to delete clients'
    }
  }

  try {
    await db.delete(clientsTable).where(eq(clientsTable.id, id))
    revalidatePath('/clients')
    return { success: true, message: 'Client deleted successfully' }
  } catch (err) {
    console.error('Delete error:', err)
    return { success: false, message: 'Failed to delete client' }
  }
}

/**
 * Create or update a client
 */
export const saveClientAction = actionClient
  .metadata({ actionName: 'saveClientAction' })
  .inputSchema(clientFormSchema, {
    handleValidationErrorsShape: async ve =>
      flattenValidationErrors(ve).fieldErrors
  })
  .action(
    async ({ parsedInput: client }: { parsedInput: ClientFormValues }) => {
      console.log('--- saveClientAction called ---')
      console.log('Incoming client:', client)

      const trimmedClient = {
        ...client,
        name: client.name.trim(),
        entity_type: client.entity_type.trim(),
        costCentreId: client.costCentreId,
        notes:
          typeof client.notes === 'string' && client.notes.trim() !== ''
            ? client.notes.trim()
            : null
      }

      console.log('Trimmed client:', trimmedClient)

      const { user, ui } = await getUISession()

      if (!user) {
        return {
          success: false,
          error: 'Not authenticated'
        }
      }

      if (!ui.canAccessAdmin) {
        return {
          success: false,
          error: 'You must be an administrator to add or edit clients'
        }
      }

      const isEditing = !!trimmedClient.id
      console.log('Is editing?', isEditing)

      // Validate cost centre belongs to organization
      const validCostCentre = await db.query.costCentres.findFirst({
        where: (cc, { eq, and }) =>
          and(
            eq(cc.id, trimmedClient.costCentreId),
            eq(cc.organizationId, trimmedClient.organizationId)
          )
      })

      if (!validCostCentre) {
        return {
          success: false,
          error: 'Invalid cost centre selected for this organization'
        }
      }

      // Normalized payload for Drizzle
      const normalized = {
        name: trimmedClient.name,
        organizationId: trimmedClient.organizationId,
        costCentreId: trimmedClient.costCentreId,
        entity_type: trimmedClient.entity_type,
        notes: trimmedClient.notes,
        active: trimmedClient.active ?? true
      } as const

      // ---- CREATE ----
      if (!isEditing) {
        const [inserted] = await db
          .insert(clientsTable)
          .values(normalized)
          .returning({ insertedId: clientsTable.id })

        // console.log('Created client:', inserted)
        revalidatePath('/clients')

        return {
          success: true,
          message: `Client created successfully`,
          clientId: inserted.insertedId
        }
      }

      // ---- UPDATE ----
      const [updated] = await db
        .update(clientsTable)
        .set(normalized)
        .where(eq(clientsTable.id, trimmedClient.id!))
        .returning({ updatedId: clientsTable.id })

      // console.log('Updated client:', updated)
      if (!updated) {
        throw new Error('Client not found or update failed')
      }
      revalidatePath('/clients')

      return {
        success: true,
        message: `Client updated successfully`,
        clientId: updated.updatedId
      }
    }
  )

export async function getClientById(id: string) {
  try {
    const clientById = await db.query.clients.findFirst({
      where: eq(clientsTable.id, id)
    })

    return clientById
  } catch (error) {
    console.error(error)
    return null
  }
}
