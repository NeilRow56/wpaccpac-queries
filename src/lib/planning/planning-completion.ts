// lib/planning-completion.ts
import { db } from '@/db'
import { planningDocs } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { B_DOCS } from '@/planning/registry'

export async function getPlanningCompletionForPeriod(params: {
  clientId: string
  periodId: string
}) {
  const rows = await db
    .select({
      completed: sql<number>`count(*) filter (where ${planningDocs.isComplete} = true)::int`
    })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, params.clientId),
        eq(planningDocs.periodId, params.periodId)
      )
    )

  const completed = rows[0]?.completed ?? 0

  return {
    completed,
    total: B_DOCS.length
  }
}
