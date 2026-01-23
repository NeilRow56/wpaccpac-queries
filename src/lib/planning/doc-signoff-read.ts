import { db } from '@/db'
import { planningDocSignoffs } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

// src/server-actions/doc-signoff-read.ts (or lib)
export async function getDocSignoffSummary(input: {
  clientId: string
  periodId: string
  code: string
}) {
  return db
    .select({
      reviewedAt: planningDocSignoffs.reviewedAt,
      reviewedByMemberId: planningDocSignoffs.reviewedByMemberId,
      completedAt: planningDocSignoffs.completedAt,
      completedByMemberId: planningDocSignoffs.completedByMemberId
    })
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
}
