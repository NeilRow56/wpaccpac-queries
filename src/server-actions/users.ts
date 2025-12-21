'use server'

import { db } from '@/db'
import {
  member as memberTable,
  user as userTable,
  organization as organizationTable
} from '@/db/schema'
import { auth } from '@/lib/auth'
import { getUISession, UISessionUser } from '@/lib/get-ui-session'
import { user, member, organization } from '@/db/schema'

import type { AdminOrganizationUser } from './organizations'

import { eq, inArray, isNull, not } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { redirect } from 'next/navigation'

/* -----------------------------------------------------
   SIGN UP
----------------------------------------------------- */
export const signUp = async (email: string, password: string, name: string) => {
  try {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password
      }
    })

    return { success: true, message: 'Signed up successfully.' }
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message ?? 'Unknown error'
    }
  }
}

/* -----------------------------------------------------
   SIGN IN
----------------------------------------------------- */

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
        rememberMe: true
      }
    })

    return { success: true, message: 'Signed in successfully.' }
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message ?? 'Unknown error'
    }
  }
}

/* -----------------------------------------------------
   GET CURRENT USER (session + DB user)
----------------------------------------------------- */

// import type { UISessionUser } from '@/lib/get-ui-session'

// export async function getCurrentUser(): Promise<UISessionUser> {
//   const { user } = await getUISession()
//   if (!user) redirect('/')
//   return user
// }

/**
 * Returns the currently authenticated user.
 * Throws redirect if no user is found.
 */
export async function getCurrentUser(): Promise<UISessionUser> {
  const { user } = await getUISession()

  if (!user) {
    redirect('/') // no authenticated user
  }

  return user
}

/* -----------------------------------------------------
   GET CURRENT USER ID ONLY
----------------------------------------------------- */

export async function getCurrentUserId() {
  const { user } = await getUISession()
  if (!user) redirect('/')

  return user.id
}

/* -----------------------------------------------------
   GET USER DETAILS BY ID
----------------------------------------------------- */

export async function getUserDetails(id: string) {
  return (
    (await db.select().from(userTable).where(eq(userTable.id, id)))[0] ?? null
  )
}

/* -----------------------------------------------------
   FIND ALL USERS (admin)
----------------------------------------------------- */
// server-actions/users.ts

// server-actions/users.ts

export async function getAllUsersAdmin(): Promise<AdminOrganizationUser[]> {
  const { user: sessionUser, ui } = await getUISession()

  if (!sessionUser || !ui.canAccessAdmin) {
    throw new Error('Forbidden')
  }

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,

      isSuperUser: user.isSuperUser,
      archivedAt: user.archivedAt,

      organizationId: organization.id,
      organizationName: organization.name,
      orgRole: member.role
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .innerJoin(organization, eq(member.organizationId, organization.id))

  // 🔐 normalize nullable boolean
  return rows.map(row => ({
    ...row,
    isSuperUser: row.isSuperUser ?? false
  }))
}

/* -----------------------------------------------------
   FIND ALL ACTIVE USERS (admin)
----------------------------------------------------- */

export async function getActiveUsersAdmin() {
  // Require session so this call is protected
  const { ui } = await getUISession()
  if (!ui.canAccessAdmin) throw new Error('Forbidden: Admin access required')

  return db.select().from(userTable).where(isNull(userTable.archivedAt))
}

/* -----------------------------------------------------
   DELETE USER
----------------------------------------------------- */

// export async function deleteUser(id: string) {
//   const session = await requireSession({
//     allowPaths: ['/'],
//     redirectTo: '/'
//   })

//   const uid = extractUserId(session)
//   if (!uid) throw new Error('Unauthorized')

//   // Safe type-narrowing: BetterAuth may attach a role property
//   const { user: sessUser } = session as unknown as SessionWithRole
//   const role = sessUser?.role

//   if (role !== 'admin' || uid === id) {
//     throw new Error('Forbidden operation')
//   }

//   try {
//     await db.delete(user).where(eq(user.id, id))
//   } catch (error) {
//     console.error(error)
//     return {
//       error:
//         'Failed to delete user. Admin users cannot be deleted. Users cannot delete themselves'
//     }
//   }

//   revalidatePath('/protected')
// }

/* -----------------------------------------------------
   ARCHIVE USER
----------------------------------------------------- */
type ActionResult = { success: true } | { success: false; error: string }

export async function archiveUser(userId: string): Promise<ActionResult> {
  const { ui } = await getUISession()
  if (!ui.canAccessAdmin) throw new Error('Forbidden: Admin access required')

  try {
    await db
      .update(userTable)
      .set({
        archivedAt: new Date(),
        banned: true,
        banReason: 'Archived by admin',
        banExpires: null
      })
      .where(eq(userTable.id, userId))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return { success: false, error: 'Failed to archive user' }
  }

  revalidatePath('/organization')

  return { success: true }
}
/* -----------------------------------------------------
   REINSTATE USER
----------------------------------------------------- */
export async function reinstateUser(userId: string) {
  const { ui } = await getUISession()
  if (!ui.canAccessAdmin) throw new Error('Forbidden: Admin access required')
  await db
    .update(userTable)
    .set({
      archivedAt: null,
      banned: false,
      banReason: null,
      banExpires: null
    })
    .where(eq(userTable.id, userId))

  revalidatePath('/team')
}

/* -----------------------------------------------------
   GET USERS NOT IN ORG
----------------------------------------------------- */

export async function getUsers(organizationId: string) {
  const { ui } = await getUISession()
  if (!ui.canAccessAdmin) throw new Error('Forbidden')

  const membersList = await db.query.member.findMany({
    where: eq(memberTable.organizationId, organizationId),
    columns: { userId: true }
  })

  const excludedIds = membersList.map(m => m.userId)

  return db.query.user.findMany({
    where: not(inArray(userTable.id, excludedIds))
  })
}

/**
 * Get all users who are **not** members of a specific organization.
 * Only authenticated users can call this function.
 */

export type UserSummary = {
  id: string
  name: string
  email: string
  // role: 'user' | 'admin' | 'owner' | 'superuser'
  isSuperUser: boolean
  lastActiveOrganizationId: string | null
  banned: boolean
}

export type GetUsersNotInOrganizationResponse = {
  success: boolean
  data: UserSummary[]
  error?: string
}

export async function getUsersNotInOrganizationAdmin(
  organizationId: string
): Promise<GetUsersNotInOrganizationResponse> {
  try {
    // ✅ Get typed session + UI permissions
    const { user, ui } = await getUISession()

    if (!user) return { success: false, data: [], error: 'Not authenticated' }
    if (!ui.canAccessAdmin)
      return { success: false, data: [], error: 'Forbidden' }

    const membersList = await db.query.member.findMany({
      where: (m, { eq }) => eq(m.organizationId, organizationId),
      columns: { userId: true }
    })

    const excludedIds = membersList.map(m => m.userId)

    const usersNotInOrg = await db.query.user.findMany({
      where: (u, { and, not, inArray, isNull }) =>
        and(
          isNull(u.archivedAt),
          excludedIds.length > 0 ? not(inArray(u.id, excludedIds)) : undefined
        ),

      columns: {
        id: true,
        name: true,
        email: true,
        // role: true,
        isSuperUser: true,
        lastActiveOrganizationId: true,
        banned: true
      }
    })

    const normalizedUsers: UserSummary[] = usersNotInOrg.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      // role: u.role,
      isSuperUser: u.isSuperUser ?? false,
      lastActiveOrganizationId: u.lastActiveOrganizationId ?? null,
      banned: u.banned ?? false
    }))

    return { success: true, data: normalizedUsers }
  } catch (error) {
    console.error('[getUsersNotInOrganizationAdmin] Error:', error)
    return {
      success: false,
      data: [],
      error: (error as Error).message ?? 'Unknown error'
    }
  }
}

export type UserWithOrganizations = {
  id: string
  name: string
  email: string
  organizations: {
    id: string
    name: string
    role: 'owner' | 'admin' | 'member'
  }[]
}

export async function getAllUsersWithOrganizations() {
  const { ui } = await getUISession()
  if (!ui.canAccessAdmin) throw new Error('Forbidden')

  const rows = await db
    .select({
      userId: userTable.id,
      name: userTable.name,
      email: userTable.email,
      organizationId: organizationTable.id,
      organizationName: organizationTable.name,
      role: memberTable.role
    })
    .from(memberTable)
    .innerJoin(userTable, eq(memberTable.userId, userTable.id))
    .innerJoin(
      organizationTable,
      eq(memberTable.organizationId, organizationTable.id)
    )

  // group rows by user
  const map = new Map<string, UserWithOrganizations>()

  for (const row of rows) {
    if (!map.has(row.userId)) {
      map.set(row.userId, {
        id: row.userId,
        name: row.name,
        email: row.email,
        organizations: []
      })
    }

    map.get(row.userId)!.organizations.push({
      id: row.organizationId,
      name: row.organizationName,
      role: row.role
    })
  }

  return Array.from(map.values())
}

export async function getUserArchiveStatus(userId: string) {
  const { ui } = await getUISession()
  if (!ui.canAccessAdmin) throw new Error('Forbidden')

  const user = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: { archivedAt: true }
  })

  return Boolean(user?.archivedAt)
}

// server-actions/users.ts
export async function getUserArchiveInfo(userId: string) {
  const { ui } = await getUISession()
  if (!ui.canAccessAdmin) throw new Error('Forbidden')

  const user = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: {
      archivedAt: true
    }
  })

  return user?.archivedAt ?? null
}
