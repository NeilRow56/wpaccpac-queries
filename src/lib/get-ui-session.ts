// lib/get-ui-session.ts
import { Session as BetterAuthSession } from '@/lib/auth'
import { db } from '@/db'
import { user as userTable, member, organization } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { extractUserId } from './extract-user-Id'
import { auth } from '@/lib/auth'
import { nextHeadersToObject } from './nextHeadersToObject'

export type UISession = {
  session: BetterAuthSession | null
  user: {
    id: string
    email: string
    name: string
    role: 'superuser' | 'admin' | 'owner' | 'user'
    isSuperUser: boolean
    lastActiveOrganizationId: string | null
    banned: boolean
    image?: string
    organizations: { id: string; name: string; slug: string }[]
  } | null
  ui: {
    canCreateOrganization: boolean
    canAccessAdmin: boolean
  }
}

export async function getUISession(): Promise<UISession> {
  // Get session without redirecting
  const headersObj = await nextHeadersToObject()
  const session = (await auth.api.getSession({
    headers: headersObj
  })) as BetterAuthSession | null

  const userId = extractUserId(session)

  if (!userId) {
    return {
      session,
      user: null,
      ui: { canCreateOrganization: false, canAccessAdmin: false }
    }
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuperUser: true,
      lastActiveOrganizationId: true,
      banned: true,
      image: true
    }
  })

  if (!dbUser) {
    return {
      session,
      user: null,
      ui: { canCreateOrganization: false, canAccessAdmin: false }
    }
  }

  const orgMemberships = await db.query.member.findMany({
    where: eq(member.userId, dbUser.id),
    columns: { organizationId: true }
  })

  const organizations = await Promise.all(
    orgMemberships.map(async m => {
      const org = await db.query.organization.findFirst({
        where: eq(organization.id, m.organizationId),
        columns: { name: true, slug: true }
      })
      return {
        id: m.organizationId,
        name: org?.name ?? '',
        slug: org?.slug ?? ''
      }
    })
  )

  const userWithOrgs = {
    ...dbUser,
    isSuperUser: dbUser.isSuperUser ?? false,
    banned: dbUser.banned ?? false,
    image: dbUser.image ?? undefined,
    organizations
  }

  const ui = {
    canCreateOrganization:
      userWithOrgs.isSuperUser ||
      (userWithOrgs.role === 'admin' && organizations.length === 0),
    canAccessAdmin: userWithOrgs.isSuperUser || userWithOrgs.role === 'admin'
  }

  return { session, user: userWithOrgs, ui }
}
