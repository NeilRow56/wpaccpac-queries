// src/server-actions/doc-signoff.ts
'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import {
  planningDocSignoffs,
  SignoffEvent
} from '@/db/schema/planningDocSignoffs'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

export async function toggleDocSignoffAction(input: {
  clientId: string
  periodId: string
  code: string
  kind: 'REVIEWED' | 'COMPLETED'
  checked: boolean
  memberId: string | null // required if checked=true
}): Promise<ActionResult<null>> {
  try {
    const now = new Date()
    const nowIso = now.toISOString()

    if (input.checked && !input.memberId) {
      return { success: false, message: 'Member is required' }
    }

    const existing = await db
      .select()
      .from(planningDocSignoffs)
      .where(
        and(
          eq(planningDocSignoffs.clientId, input.clientId),
          eq(planningDocSignoffs.periodId, input.periodId),
          eq(planningDocSignoffs.code, input.code)
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    const history: SignoffEvent[] = Array.isArray(existing?.history)
      ? (existing!.history as SignoffEvent[])
      : []

    const isReviewed = input.kind === 'REVIEWED'

    const event: SignoffEvent = input.checked
      ? isReviewed
        ? { type: 'REVIEWED_SET', memberId: input.memberId!, at: nowIso }
        : { type: 'COMPLETED_SET', memberId: input.memberId!, at: nowIso }
      : isReviewed
        ? {
            type: 'REVIEWED_CLEARED',
            memberId: existing?.reviewedByMemberId ?? null,
            at: nowIso
          }
        : {
            type: 'COMPLETED_CLEARED',
            memberId: existing?.completedByMemberId ?? null,
            at: nowIso
          }

    const nextHistory = [...history, event]

    const setPatch = isReviewed
      ? {
          reviewedByMemberId: input.checked ? input.memberId : null,
          reviewedAt: input.checked ? now : null
        }
      : {
          completedByMemberId: input.checked ? input.memberId : null,
          completedAt: input.checked ? now : null
        }

    await db
      .insert(planningDocSignoffs)
      .values({
        clientId: input.clientId,
        periodId: input.periodId,
        code: input.code,
        ...setPatch,
        history: nextHistory
      })
      .onConflictDoUpdate({
        target: [
          planningDocSignoffs.clientId,
          planningDocSignoffs.periodId,
          planningDocSignoffs.code
        ],
        set: {
          ...setPatch,
          history: nextHistory,
          updatedAt: now
        }
      })

    revalidatePath(
      `/organisation/clients/${input.clientId}/accounting-periods/${input.periodId}/planning`
    )

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to update signoff'
    }
  }
}
