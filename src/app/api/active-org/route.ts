import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { user as userTable, member } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return NextResponse.json({ organizationId: null })

  const dbUser = await db.query.user.findFirst({
    where: eq(userTable.id, session.user.id),
    columns: { lastActiveOrganizationId: true }
  })

  if (dbUser?.lastActiveOrganizationId) {
    return NextResponse.json({
      organizationId: dbUser.lastActiveOrganizationId
    })
  }

  // Fallback: first membership
  const firstMembership = await db.query.member.findFirst({
    where: eq(member.userId, session.user.id),
    columns: { organizationId: true }
  })

  return NextResponse.json({
    organizationId: firstMembership?.organizationId ?? null
  })
}
