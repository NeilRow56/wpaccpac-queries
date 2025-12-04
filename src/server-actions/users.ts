'use server'

import { db } from '@/db'
import { member, user } from '@/db/schema'

import { auth } from '@/lib/auth'
import { asc, eq, inArray, not } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const signUp = async (email: string, password: string, name: string) => {
  try {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        isSuperUser: false
      }
    })

    return {
      success: true,
      message: 'Signed up successfully.'
    }
  } catch (error) {
    const e = error as Error

    return {
      success: false,
      message: e.message || 'An unknown error occurred.'
    }
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
        rememberMe: true
      }
    })

    return {
      success: true,
      message: 'Signed in successfully.'
    }
  } catch (error) {
    const e = error as Error

    return {
      success: false,
      message: e.message || 'An unknown error occurred.'
    }
  }
}

export const getCurrentUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    redirect('/auth')
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id)
  })

  if (!currentUser) {
    redirect('/auth')
  }

  return {
    ...session,
    currentUser
  }
}

export const getCurrentUserId = async () => {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    redirect('/auth')
  }

  const userId = session.session.userId

  return {
    ...session,
    userId
  }
}

export async function getUserDetails(id: string) {
  const userDetails = await db.select().from(user).where(eq(user.id, id))

  return userDetails[0]
}

export async function findAllUsers() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) redirect('/auth/sign-in')

  const allUsers = await db.select().from(user).orderBy(asc(user.name))

  return allUsers
}

export async function deleteUser(id: string) {
  const headersList = await headers()

  const session = await auth.api.getSession({
    headers: headersList
  })

  if (!session) throw new Error('Unauthorized')

  if (session.user.role !== 'admin' || session.user.id === id) {
    throw new Error('Forbidden operation')
  }

  try {
    await db.delete(user).where(eq(user.id, id))
  } catch (error) {
    console.error(error)
    return {
      error:
        'Failed to delete user. Admin users cannot be deleted. Users cannot delete themselves'
    }
  }

  revalidatePath('/protected')
}

export const getUsers = async (organizationId: string) => {
  try {
    const members = await db.query.member.findMany({
      where: eq(member.organizationId, organizationId)
    })

    const users = await db.query.user.findMany({
      where: not(
        inArray(
          user.id,
          members.map(m => m.userId)
        )
      )
    })

    return users
  } catch (error) {
    console.error(error)
    return []
  }
}
