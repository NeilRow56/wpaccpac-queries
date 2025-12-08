'use server'

import { db } from '@/db'
import { clients } from '@/db/schema'
import { and, asc, eq } from 'drizzle-orm'

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
