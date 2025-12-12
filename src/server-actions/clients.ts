'use server'

import { db } from '@/db'
import { clients, costCentres } from '@/db/schema'
import { auth } from '@/lib/auth'
import { actionClient } from '@/lib/safe-action'
import {
  insertClientSchema,
  insertClientSchemaType
} from '@/zod-schemas/clients'
import { asc, eq } from 'drizzle-orm'
import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Get all active clients for an organization with cost centre name
 */
// export async function getActiveOrganizationClients(organizationId: string) {
//   const clientsByOrganizationId = await db
//     .select({
//       id: clients.id,
//       name: clients.name,
//       organizationId: clients.organizationId,
//       entity_type: clients.entity_type,
//       costCentreId: clients.costCentreId,
//       costCentreName: costCentres.name, // join column
//       notes: clients.notes,
//       active: clients.active
//     })
//     .from(clients)
//     .leftJoin(costCentres, eq(costCentres.id, clients.costCentreId))
//     .where(eq(clients.organizationId, organizationId))
//     .orderBy(asc(clients.name))

//   return clientsByOrganizationId
// }

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
  const clientsWithCostCentre = await db
    .select({
      id: clients.id,
      name: clients.name,
      entity_type: clients.entity_type,
      costCentreId: clients.costCentreId,
      costCentreName: costCentres.name, // join to get name
      organizationId: clients.organizationId,
      notes: clients.notes,
      active: clients.active
    })
    .from(clients)
    .leftJoin(costCentres, eq(clients.costCentreId, costCentres.id))
    .where(eq(clients.organizationId, organizationId))
    .orderBy(asc(clients.name))

  return clientsWithCostCentre
}
/**
 * Delete a client
 */
export async function deleteClient(id: string) {
  try {
    await db.delete(clients).where(eq(clients.id, id))
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
  .inputSchema(insertClientSchema, {
    handleValidationErrorsShape: async ve =>
      flattenValidationErrors(ve).fieldErrors
  })
  .action(
    async ({
      parsedInput: client
    }: {
      parsedInput: insertClientSchemaType
    }) => {
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

      const session = await auth.api.getSession({ headers: await headers() })
      if (!session) redirect('/auth/sign-in')
      if (!session.user || session.user.role !== 'admin') {
        throw new Error('You must be an administrator to add/access this data')
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
        throw new Error('Invalid cost centre selected for this organization.')
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
          .insert(clients)
          .values(normalized)
          .returning({ insertedId: clients.id })

        console.log('Created client:', inserted)
        revalidatePath('/clients')

        return {
          message: `Client #${inserted.insertedId} created successfully`,
          clientId: inserted.insertedId
        }
      }

      // ---- UPDATE ----
      const [updated] = await db
        .update(clients)
        .set(normalized)
        .where(eq(clients.id, trimmedClient.id!))
        .returning({ updatedId: clients.id })

      console.log('Updated client:', updated)
      revalidatePath('/clients')

      return {
        message: `Client #${updated.updatedId} updated successfully`,
        clientId: updated.updatedId
      }
    }
  )
