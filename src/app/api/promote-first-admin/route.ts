// app/api/promote-first-admin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'

import { UserExecutor } from '@/lib/use-executor-type'
import { assignFirstAdmin } from '@/lib/auth-logic/assign-first-admin'

interface PromoteFirstAdminBody {
  userId: string
  organizationId: string
}

export async function POST(req: NextRequest) {
  try {
    const body: PromoteFirstAdminBody = await req.json()

    if (!body.userId || !body.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or organizationId' },
        { status: 400 }
      )
    }

    // Use the DB executor to run the promotion logic
    const executor = db as unknown as UserExecutor

    await assignFirstAdmin(executor, body.userId, body.organizationId)

    return NextResponse.json({ success: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('[promote-first-admin]', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
