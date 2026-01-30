import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { member as memberTable } from '@/db/schema'
import { getUISession } from '@/lib/get-ui-session'

export type SessionContext = {
  organizationId: string
  memberId: string
  userId: string
}

export async function getSessionContext(): Promise<SessionContext> {
  const { user } = await getUISession()
  if (!user) throw new Error('Unauthorised')

  // Find the user's membership (same pattern you already use in organisation/page.tsx)
  const membership = await db.query.member.findFirst({
    where: eq(memberTable.userId, user.id)
  })

  if (!membership) {
    // up to you: throw, or redirect to dashboard
    // redirect('/dashboard')
    throw new Error('No membership found for user')
  }

  return {
    userId: user.id,
    memberId: membership.id,
    organizationId: membership.organizationId
  }
}
