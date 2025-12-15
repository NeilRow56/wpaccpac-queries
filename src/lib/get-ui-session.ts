// src/lib/getUISession.ts
import { Session as BetterAuthSession } from '@/lib/auth'
import { db } from '@/db'
import { user as userTable, member, organization } from '@/db/schema'

import { eq } from 'drizzle-orm'
import { extractUserId } from './extract-user-Id'
import { requireSession } from './requireSession'

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
    image?: string // ✅ optional image property
    organizations: { id: string; name: string; slug: string }[]
  } | null
  ui: {
    canCreateOrganization: boolean
    canAccessAdmin: boolean
  }
}

export async function getUISession(): Promise<UISession> {
  // Get raw BetterAuth session
  const session = (await requireSession({
    allowPaths: ['/'],
    redirectTo: '/auth'
  })) as BetterAuthSession | null

  const userId = extractUserId(session)
  if (!userId) {
    return {
      session,
      user: null,
      ui: { canCreateOrganization: false, canAccessAdmin: false }
    }
  }

  // Fetch full DB user
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
      image: true // include image column
    }
  })

  if (!dbUser) {
    return {
      session,
      user: null,
      ui: { canCreateOrganization: false, canAccessAdmin: false }
    }
  }

  const isSuperUser = dbUser.isSuperUser ?? false
  const banned = dbUser.banned ?? false

  // Fetch organizations with slug
  const orgMemberships = await db.query.member.findMany({
    where: eq(member.userId, dbUser.id),
    columns: { organizationId: true }
  })

  const organizations = await Promise.all(
    orgMemberships.map(async o => {
      const org = await db.query.organization.findFirst({
        where: eq(organization.id, o.organizationId),
        columns: { name: true, slug: true }
      })
      return {
        id: o.organizationId,
        name: org?.name ?? '',
        slug: org?.slug ?? ''
      }
    })
  )

  const userWithOrgs = {
    ...dbUser,
    isSuperUser,
    banned,
    image: dbUser.image ?? undefined, // ✅ normalize null to undefined
    organizations
  }

  const ui = {
    canCreateOrganization:
      isSuperUser || (dbUser.role === 'admin' && organizations.length === 0),
    canAccessAdmin: isSuperUser || dbUser.role === 'admin'
  }

  return { session, user: userWithOrgs, ui }
}
