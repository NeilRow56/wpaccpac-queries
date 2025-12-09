'use server'

import { db } from '@/db'
import { clients, costCentres, organization } from '@/db/schema'

import { auth } from '@/lib/auth'
import { actionClient } from '@/lib/safe-action'
import {
  insertClientSchema,
  insertClientSchemaType
} from '@/zod-schemas/clients'
import { and, asc, eq } from 'drizzle-orm'
import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

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
 * Delete a client (non-safe-action mutation).
 */
export async function deleteClient(id: string, path: string) {
  try {
    await db.delete(clients).where(eq(clients.id, id))
    revalidatePath(path)
    return { success: true, message: 'Client deleted successfully' }
  } catch {
    return { success: false, message: 'Failed to delete client' }
  }
}

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
      const session = await auth.api.getSession({ headers: await headers() })
      if (!session) redirect('/auth/sign-in')
      if (!session.user || session.user.role !== 'admin') {
        throw new Error('You must be an administrator to add/access this data')
      }

      const clientName = client.name.trim()
      const costCentreName = client.cost_centre_name?.trim() || ''
      const entityType = client.entity_type?.trim() || ''
      const notes = client.notes?.trim() || ''
      const isEditing = !!client.id

      // --- SAFETY CHECK: verify organization exists ---
      const orgExists = await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, client.organizationId))

      if (!orgExists || orgExists.length === 0) {
        throw new Error(
          `Organization with ID "${client.organizationId}" does not exist`
        )
      }

      // 2️⃣ Check cost centre exists for that organization
      const costCentreExists = await db
        .select({ id: costCentres.id })
        .from(costCentres)
        .where(
          and(
            eq(costCentres.name, costCentreName),
            eq(costCentres.organizationId, client.organizationId)
          )
        )

      if (costCentreExists.length === 0) {
        throw new Error(
          `Cost centre "${costCentreName}" does not exist for organization ${client.organizationId}`
        )
      }

      if (!isEditing) {
        // CREATE
        const [inserted] = await db
          .insert(clients)
          .values({
            name: clientName,
            organizationId: client.organizationId,
            cost_centre_name: costCentreName,
            entity_type: entityType,
            notes,
            active: client.active
          })
          .returning({ insertedId: clients.id })

        console.log('✅ Inserted client:', inserted)

        return {
          message: `Client #${inserted.insertedId} created successfully`
        }
      } else {
        // UPDATE
        if (!client.id) throw new Error('Client ID is required for update')

        const [updated] = await db
          .update(clients)
          .set({
            name: clientName,
            organizationId: client.organizationId,
            cost_centre_name: costCentreName,
            entity_type: entityType,
            notes,
            active: client.active
          })
          // .where({ id: client.id })
          .where(eq(clients.id, client.id!))
          .returning({ updatedId: clients.id })

        console.log('✅ Updated client:', updated)

        return { message: `Client #${updated.updatedId} updated successfully` }
      }
    }
  )
