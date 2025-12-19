'use server'

import { eq, inArray } from 'drizzle-orm'

import { getCurrentUser } from './users'
import { db } from '@/db'
import { revalidatePath } from 'next/cache'
import {
  member as memberTable,
  user as userTable,
  organization as organizationTable
} from '@/db/schema'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getUISession } from '@/lib/get-ui-session'

export type OrganizationUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean | null
  banned: boolean | null
  banReason: string | null
  createdAt: Date
  image: string | null
  isSuperUser: boolean | null
  orgRole: 'owner' | 'admin' | 'member'
}

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

export async function getOrganizationUsers(
  organizationId: string
): Promise<OrganizationUser[]> {
  // 1️⃣ Get session + UI permissions
  const { user, ui } = await getUISession()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // 2️⃣ Enforce org-level admin access
  if (!ui.canAccessAdmin) {
    throw new Error('Forbidden: Admin access required')
  }

  // 3️⃣ Fetch users via membership table
  const users = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      emailVerified: userTable.emailVerified,
      banned: userTable.banned,
      banReason: userTable.banReason,
      createdAt: userTable.createdAt,
      image: userTable.image,
      isSuperUser: userTable.isSuperUser,
      orgRole: memberTable.role
    })
    .from(memberTable)
    .innerJoin(userTable, eq(memberTable.userId, userTable.id))
    .where(eq(memberTable.organizationId, organizationId))

  return users
}
