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

// // NEXT SAFE ACTION

// export const saveClientAction = actionClient
//   .metadata({ actionName: 'saveClientAction' })
//   .inputSchema(insertClientSchema, {
//     handleValidationErrorsShape: async ve =>
//       flattenValidationErrors(ve).fieldErrors
//   })
//   .action(
//     async ({
//       parsedInput: client
//     }: {
//       parsedInput: insertClientSchemaType
//     }) => {
//       /* ------------------------ AUTHENTICATION CHECK ------------------------ */
//       const session = await auth.api.getSession({
//         headers: await headers()
//       })

//       if (!session) redirect('/auth')

//       if (!session.user || session.user.role !== 'admin') {
//         throw new Error('You must be an administrator to add/access this data')
//       }

//       /* ----------------------------- DUPLICATE CHECK ----------------------------- */
//       const duplicates = await existingClient(
//         client.name,
//         client.organizationId
//       )

//       // Editing: allow duplicate if it is THIS record
//       const isEditing = client.id !== ''
//       if (duplicates.length > 0) {
//         const isSameRecord = isEditing && duplicates[0].id === client.id

//         if (!isSameRecord) {
//           throw new Error('Cost centre already exists')
//         }
//       }

//       /* ---------------------------------- CREATE ---------------------------------- */
//       if (!isEditing) {
//         const result = await db
//           .insert(clients)
//           .values({
//             name: client.name,
//             organizationId: client.organizationId,
//             entity_type: client.entity_type || 'Unknown',
//             cost_centre_name: client.cost_centre_name || '',
//             notes: client.notes || '',
//             active: client.active
//           })
//           .returning({ insertedId: clients.id })

//         return {
//           message: `Cost centre #${result[0].insertedId} created successfully`
//         }
//       }

//       /* ---------------------------------- UPDATE ---------------------------------- */
//       const result = await db
//         .update(clients)
//         .set({
//           name: client.name,
//           organizationId: client.organizationId,
//           entity_type: client.entity_type || 'Unknown',
//           cost_centre_name: client.cost_centre_name || '',
//           notes: client.notes || '',
//           active: client.active
//         })
//         .where(eq(clients.id, client.id!))
//         .returning({ updatedId: clients.id })

//       return {
//         message: `Cost centre #${result[0].updatedId} updated successfully`
//       }
//     }
//   )
