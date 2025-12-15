'use server'

import { eq, inArray } from 'drizzle-orm'

import { getCurrentUser } from './users'
import { db } from '@/db'
import { revalidatePath } from 'next/cache'
import {
  member as memberTable,
  organization as organizationTable
} from '@/db/schema'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getUISession } from '@/lib/get-ui-session'
import { authClient } from '@/lib/auth-client'
import { CreateOrganizationResult } from '@/lib/action-types'

export async function getOrganizationsByUserId() {
  const currentUser = await getCurrentUser()

  const userId = currentUser.id

  const members = await db.query.member.findMany({
    where: eq(memberTable.userId, userId)
  })

  const organizations = await db.query.organization.findMany({
    where: inArray(
      organizationTable.id,
      members.map(m => m.organizationId)
    )
  })

  return organizations
}

export async function getActiveOrganization(userId: string) {
  const memberUser = await db.query.member.findFirst({
    where: eq(memberTable.userId, userId)
  })

  if (!memberUser) {
    return null
  }

  const activeOrganization = await db.query.organization.findFirst({
    where: eq(organizationTable.id, memberUser.organizationId)
  })

  return activeOrganization
}

export async function getOrganizationBySlug(slug: string) {
  try {
    const organizationBySlug = await db.query.organization.findFirst({
      where: eq(organizationTable.slug, slug),
      with: {
        members: {
          with: {
            user: true
          }
        }
      }
    })

    return organizationBySlug
  } catch (error) {
    console.error(error)
    return null
  }
}

export const deleteOrganization = async (id: string, path: string) => {
  try {
    await db.delete(organizationTable).where(eq(organizationTable.id, id))
    revalidatePath(path)
    return { success: true, message: 'Organization deleted successfully' }
  } catch {
    return { success: false, message: 'Failed to delete organization' }
  }
}

export async function getCurrentOrganization() {
  const result = await auth.api.getSession({
    headers: await headers()
  })

  // Check that session exists
  if (!result?.session?.activeOrganizationId) return null

  const activeOrgId = result.session.activeOrganizationId

  const org = await db.query.organization.findFirst({
    where: eq(organizationTable.id, activeOrgId)
  })

  return org || null
}

export async function createOrganizationAction(
  name: string,
  slug: string
): Promise<CreateOrganizationResult> {
  const { user, ui } = await getUISession()

  if (!user) {
    throw new Error('Not authenticated')
  }

  if (!ui.canCreateOrganization) {
    return {
      success: false,
      error: 'You are not allowed to create an organization'
    }
  }

  // Optional hard bootstrap lock
  if (user.organizations.length > 0 && !user.isSuperUser) {
    return {
      success: false,
      error: 'You already belong to an organization'
    }
  }

  // ✅ Use better-auth CLIENT SDK even on the server
  //✔ Why this is correct
  //Fully type-safe
  //Fully authorized
  //No duplication
  //No internal Better Auth APIs used
  //Matches how Better Auth expects orgs to be created
  const res = await authClient.organization.create({
    name,
    slug
  })

  if (res.error || !res.data?.id) {
    return {
      success: false,
      error: res.error?.message ?? 'Failed to create organization'
    }
  }

  await authClient.organization.setActive({
    organizationId: res.data!.id
  })

  return {
    success: true as const,
    organizationId: res.data!.id
  }
}
