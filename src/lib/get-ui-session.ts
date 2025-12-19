import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user as userTable, member } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { extractUserId } from './extract-user-Id'
import { nextHeadersToObject } from './nextHeadersToObject'
import type { AppSession } from './types/auth-session'

export type UISessionUser = {
  id: string
  email: string
  name: string
  orgRole: 'owner' | 'admin' | 'member'
  isSuperUser: boolean
}

export type UISession = {
  session: AppSession
  user: UISessionUser | null
  ui: {
    canCreateOrganization: boolean
    canAccessAdmin: boolean
  }
}

export async function getUISession(): Promise<UISession> {
  const headersObj = await nextHeadersToObject()

  const session: AppSession =
    (await auth.api.getSession({ headers: headersObj })) ?? null

  const userId = extractUserId(session)

  if (!userId) {
    return {
      session,
      user: null,
      ui: { canCreateOrganization: false, canAccessAdmin: false }
    }
  }

  const [dbUser] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
      isSuperUser: userTable.isSuperUser
    })
    .from(userTable)
    .where(eq(userTable.id, userId))

  if (!dbUser) {
    return {
      session,
      user: null,
      ui: { canCreateOrganization: false, canAccessAdmin: false }
    }
  }

  // 🔑 Resolve active organization (single-org safe)
  let activeOrganizationId = session?.activeOrganizationId ?? null

  if (!activeOrganizationId) {
    const memberships = await db.query.member.findMany({
      where: eq(member.userId, userId),
      columns: { organizationId: true }
    })

    if (memberships.length >= 1) {
      activeOrganizationId = memberships[0].organizationId
    }
  }

  let orgRole: 'owner' | 'admin' | 'member' = 'member'

  if (activeOrganizationId) {
    const membership = await db.query.member.findFirst({
      where: and(
        eq(member.userId, userId),
        eq(member.organizationId, activeOrganizationId)
      )
    })

    orgRole = membership?.role ?? 'member'
  }

  const isSuperUser = dbUser.isSuperUser ?? false

  return {
    session: session ? { ...session, activeOrganizationId } : null,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      isSuperUser,
      orgRole
    },
    ui: {
      canCreateOrganization: isSuperUser || orgRole === 'owner',
      canAccessAdmin: isSuperUser || orgRole === 'owner' || orgRole === 'admin'
    }
  }
}
