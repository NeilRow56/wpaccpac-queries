import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { planningDocSignoffs } from '@/db/schema/planningDocSignoffs'

export async function getDocSignoffHistory(input: {
  clientId: string
  periodId: string
  code: string
}) {
  const row = await db
    .select({
      history: planningDocSignoffs.history,
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

  const history = row?.history ?? [] // already SignoffEvent[]
  return { row, history }
}
