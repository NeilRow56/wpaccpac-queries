import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const { organizationId } = await req.json()

  // Get the current session
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.session?.userId) {
    return new Response('Not authenticated', { status: 401 })
  }

  const userId = session.session.userId

  // Persist the selected organization
  await db
    .update(user)
    .set({ lastActiveOrganizationId: organizationId })
    .where(eq(user.id, userId))

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
