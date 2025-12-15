import { db } from '@/db'
import { user as userTable } from '@/db/schema'
import { eq } from 'drizzle-orm'

import { getUISession } from '@/lib/get-ui-session'

interface SwitchOrgRequest {
  organizationId: string
}

export async function POST(req: Request) {
  const { organizationId }: SwitchOrgRequest = await req.json()

  const { user } = await getUISession()

  if (!user) {
    throw new Error('User not found or not authenticated')
  }

  const userId = user.id
  try {
    await db
      .update(userTable)
      .set({ lastActiveOrganizationId: organizationId })
      .where(eq(userTable.id, userId))

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}
