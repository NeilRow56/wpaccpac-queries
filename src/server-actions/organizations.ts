'use server'

import { eq, inArray } from 'drizzle-orm'

import { getCurrentUser } from './users'
import { db } from '@/db'
import { revalidatePath } from 'next/cache'
import { member, organization } from '@/db/schema'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function getOrganizationsByUserId() {
  const { currentUser } = await getCurrentUser()

  const userId = currentUser.id

  console.log(userId)

  const members = await db.query.member.findMany({
    where: eq(member.userId, currentUser.id)
  })

  const organizations = await db.query.organization.findMany({
    where: inArray(
      organization.id,
      members.map(m => m.organizationId)
    )
  })

  return organizations
}

export async function getActiveOrganization(userId: string) {
  const memberUser = await db.query.member.findFirst({
    where: eq(member.userId, userId)
  })

  if (!memberUser) {
    return null
  }

  const activeOrganization = await db.query.organization.findFirst({
    where: eq(organization.id, memberUser.organizationId)
  })

  return activeOrganization
}

export async function getOrganizationBySlug(slug: string) {
  try {
    const organizationBySlug = await db.query.organization.findFirst({
      where: eq(organization.slug, slug),
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
    await db.delete(organization).where(eq(organization.id, id))
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
    where: eq(organization.id, activeOrgId)
  })

  return org || null
}

// export async function getOrganizationsByUserId(userId) {

// }
