'use server'

import { and, eq } from 'drizzle-orm'
import { getUISession } from '@/lib/get-ui-session'
import { member as memberTable } from '@/db/schema'

import { isAdmin } from './permissions'
import { db } from '@/db'

export const removeMember = async (memberId: string) => {
  const admin = await isAdmin()
  if (!admin) {
    return { success: false, error: 'Not authorized' }
  }

  try {
    await db.delete(memberTable).where(eq(memberTable.id, memberId))

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

export async function archiveOrganizationMember({
  userId
}: {
  userId: string
}) {
  const { session, user, ui } = await getUISession()

  if (!user || !ui.canAccessAdmin) {
    throw new Error('Forbidden')
  }

  if (!session?.activeOrganizationId) {
    throw new Error('No active organization')
  }

  await db
    .update(memberTable)
    .set({
      archivedAt: new Date(),
      archivedBy: user.id
    })
    .where(
      and(
        eq(memberTable.userId, userId),
        eq(memberTable.organizationId, session.activeOrganizationId)
      )
    )
}

// src/server-actions/members.ts

export async function updateMemberRole(
  memberId: string,
  role: 'admin' | 'member'
) {
  const { ui } = await getUISession()
  if (!ui.canAccessAdmin) {
    throw new Error('Forbidden')
  }

  await db.update(memberTable).set({ role }).where(eq(memberTable.id, memberId))
}
