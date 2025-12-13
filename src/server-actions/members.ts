'use server'

import { eq } from 'drizzle-orm'

import { member } from '@/db/schema'

import { isAdmin } from './permissions'
import { db } from '@/db'

export const removeMember = async (memberId: string) => {
  const admin = await isAdmin()
  if (!admin) {
    return { success: false, error: 'Not authorized' }
  }

  try {
    await db.delete(member).where(eq(member.id, memberId))

    return {
      success: true,
      error: null
    }
  } catch (error) {
    console.error(error)
    return {
      success: false,
      error: 'Failed to remove member.'
    }
  }
}
