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
 * Get all active clients for an organization
 */
export async function getActiveOrganizationClients(organizationId: string) {
  const clientsByOrganizationId = await db
    .select({
      id: clients.id,
      name: clients.name,
      organizationId: clients.organizationId,
      entity_type: clients.entity_type,
      cost_centre_name: clients.cost_centre_name,
      notes: clients.notes,
      active: clients.active
    })
    .from(clients)
    .where(eq(clients.organizationId, organizationId))
    .orderBy(asc(clients.name))

  return clientsByOrganizationId
}

/**
 * Delete a client
 */
export async function deleteClient(id: string) {
  try {
    await db.delete(clients).where(eq(clients.id, id))

    // 👇 This line forces the table to refresh automatically
    revalidatePath('/clients')

    return { success: true, message: 'Client deleted successfully' }
  } catch (err) {
    console.error('Delete error:', err)
    return { success: false, message: 'Failed to delete client' }
  }
}

/**
 * Save client action (create or update)
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
      console.log('Client data:', client)

      // Trim all inputs
      const trimmedClient = {
        ...client,
        name: client.name.trim(),
        cost_centre_name: client.cost_centre_name.trim(),
        entity_type: client.entity_type.trim(),
        notes: client.notes?.trim() ?? ''
      }
      console.log('Trimmed client:', trimmedClient)

      const session = await auth.api.getSession({ headers: await headers() })
      if (!session) redirect('/auth/sign-in')
      if (!session.user || session.user.role !== 'admin') {
        throw new Error('You must be an administrator to add/access this data')
      }

      const isEditing = !!trimmedClient.id
      console.log('Editing?', isEditing)

      // Fetch all cost centres for this organization
      const allCostCentres = await db
        .select({ id: costCentres.id, name: costCentres.name })
        .from(costCentres)
        .where(eq(costCentres.organizationId, trimmedClient.organizationId))

      console.log('All DB Cost Centres:', allCostCentres)

      // Find matching cost centre (trimmed & case-insensitive)
      const matchedCostCentre = allCostCentres.find(
        cc =>
          cc.name.trim().toLowerCase() ===
          trimmedClient.cost_centre_name.toLowerCase()
      )

      if (!matchedCostCentre) {
        throw new Error(
          `Cost centre "${trimmedClient.cost_centre_name}" does not exist for organization ${trimmedClient.organizationId}`
        )
      }

      if (!isEditing) {
        // CREATE
        const [inserted] = await db
          .insert(clients)
          .values({
            name: trimmedClient.name,
            organizationId: trimmedClient.organizationId,
            cost_centre_name: matchedCostCentre.name,
            entity_type: trimmedClient.entity_type,
            notes: trimmedClient.notes,
            active: trimmedClient.active
          })
          .returning({ insertedId: clients.id })

        console.log('✅ Inserted client:', inserted)
        return {
          message: `Client #${inserted.insertedId} created successfully`,
          clientId: inserted.insertedId
        }
      } else {
        // UPDATE
        if (!trimmedClient.id)
          throw new Error('Client ID is required for update')

        const [updated] = await db
          .update(clients)
          .set({
            name: trimmedClient.name,
            organizationId: trimmedClient.organizationId,
            cost_centre_name: matchedCostCentre.name,
            entity_type: trimmedClient.entity_type,
            notes: trimmedClient.notes,
            active: trimmedClient.active
          })
          .where(eq(clients.id, trimmedClient.id))
          .returning({ updatedId: clients.id })

        console.log('✅ Updated client:', updated)
        return {
          message: `Client #${updated.updatedId} updated successfully`,
          clientId: updated.updatedId
        }
      }
    }
  )
