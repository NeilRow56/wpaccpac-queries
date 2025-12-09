'use server'

import { db } from '@/db'
import { clients } from '@/db/schema'
import { auth } from '@/lib/auth'
import { actionClient } from '@/lib/safe-action'

import {
  insertClientSchema,
  insertClientSchemaType
} from '@/zod-schemas/clients'

import { asc, eq, and } from 'drizzle-orm'
import { flattenValidationErrors } from 'next-safe-action'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function getActiveOrganizationClients(organizationId: string) {
  const categoriesByOrganizationId = await db
    .select({
      id: clients.id,
      name: clients.name,
      organizationId: clients.organizationId
    })
    .from(clients)
    .where(and(eq(clients.organizationId, organizationId)))
    .orderBy(asc(clients.name))

  return categoriesByOrganizationId
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

/**
 * Check if cost centre exists (returns row array).
 */
export async function existingClient(name: string, organizationId: string) {
  return await db
    .select()
    .from(clients)
    .where(
      and(eq(clients.name, name), eq(clients.organizationId, organizationId))
    )
}

// Authentication check
const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect('/auth')
if (!session.user || session.user.role !== 'admin') {
  throw new Error('You must be an administrator to add/access this data')
}

// NEXT SAFE ACTION

//use-safe-actions

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
      const session = await auth.api.getSession({
        headers: await headers()
      })

      if (!session) redirect('/auth/sign-in')

      // ERROR TESTS

      // throw Error('test error client create action')

      // New Client
      // All new clients are active by default - no need to set active to true
      // createdAt and updatedAt are set by the database

      if (client.id === '') {
        const result = await db
          .insert(clients)
          .values({
            name: client.name,
            organizationId: client.organizationId,
            entity_type: client.entity_type,
            cost_centre_name: client.cost_centre_name,

            // customer.notes is an optional field
            ...(client.notes?.trim() ? { notes: client.notes } : {})
          })
          .returning({ insertedId: clients.id })

        return {
          message: `Client ID #${result[0].insertedId} created successfully`
        }
      }

      // Existing client
      // updatedAt is set by the database
      const result = await db
        .update(clients)
        .set({
          name: client.name,
          organizationId: client.organizationId,
          entity_type: client.entity_type,
          cost_centre_name: client.cost_centre_name,
          // customer.notes is an optional field
          notes: client.notes?.trim() ?? null,
          active: client.active
        })
        // ! confirms customer.id will always exist for the update function
        .where(eq(clients.id, client.id!))
        .returning({ updatedId: clients.id })

      return {
        message: `Client ID #${result[0].updatedId} updated successfully`
      }
    }
  )
