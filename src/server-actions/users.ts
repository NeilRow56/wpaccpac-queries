'use server'

import { db } from '@/db'
import { member, user } from '@/db/schema'

import { auth } from '@/lib/auth'
import { extractUserId } from '@/lib/extract-user-Id'
import { requireSession } from '@/lib/requireSession'

import { asc, eq, inArray, not } from 'drizzle-orm'

import { redirect } from 'next/navigation'

// // HELPER
// type SessionWithRole = {
//   user?: {
//     role?: string
//     id?: string
//   }
// }

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

export async function getCurrentUser() {
  const session = await requireSession({
    allowPaths: ['/'],
    redirectTo: '/'
  })

  const userId = extractUserId(session)
  if (!userId) {
    console.log('[getCurrentUser] Session exists but no userId')
    redirect('/')
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId)
  })

  if (!currentUser) {
    console.log('[getCurrentUser] No DB user found for session uid')
    redirect('/')
  }

  return {
    session,
    user: currentUser
  }
}

/* -----------------------------------------------------
   GET CURRENT USER ID ONLY
----------------------------------------------------- */

export async function getCurrentUserId() {
  const session = await requireSession({
    allowPaths: ['/'],
    redirectTo: '/'
  })

  const userId = extractUserId(session)
  if (!userId) redirect('/')

  return {
    session,
    userId
  }
}

/* -----------------------------------------------------
   GET USER DETAILS BY ID
----------------------------------------------------- */

export async function getUserDetails(id: string) {
  const rows = await db.select().from(user).where(eq(user.id, id))

  return rows[0] ?? null
}

/* -----------------------------------------------------
   FIND ALL USERS (admin)
----------------------------------------------------- */

export async function findAllUsers() {
  // Require session so this call is protected
  await requireSession({
    allowPaths: ['/'],
    redirectTo: '/'
  })

  return db.select().from(user).orderBy(asc(user.name))
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
export async function archiveUser(userId: string) {
  await db
    .update(user)
    .set({
      archivedAt: new Date(),
      banned: true,
      banReason: 'Archived by admin',
      banExpires: null
    })
    .where(eq(user.id, userId))
}

/* -----------------------------------------------------
   GET USERS NOT IN ORG
----------------------------------------------------- */

export async function getUsers(organizationId: string) {
  await requireSession({ allowPaths: ['/'], redirectTo: '/' })

  try {
    const membersList = await db.query.member.findMany({
      where: eq(member.organizationId, organizationId)
    })

    const excludedIds = membersList.map(m => m.userId)

    return db.query.user.findMany({
      where: not(inArray(user.id, excludedIds))
    })
  } catch (error) {
    console.error(error)
    return []
  }
}
