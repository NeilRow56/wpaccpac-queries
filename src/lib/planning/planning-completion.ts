import { db } from '@/db'
import { planningDocs } from '@/db/schema'
import { sql, and, eq } from 'drizzle-orm'
import { B_DOCS } from '@/planning/registry'
import type { Tx } from '@/db/types'

export async function getPlanningCompletionForPeriodTx(
  tx: Tx,
  params: { clientId: string; periodId: string }
) {
  const rows = await tx
    .select({
      completed: sql<number>`
        count(*) filter (where ${planningDocs.isComplete} = true)::int
      `
    })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, params.clientId),
        eq(planningDocs.periodId, params.periodId)
      )
    )

  return {
    completed: rows[0]?.completed ?? 0,
    total: B_DOCS.length
  }
}

/**
 * Non-transactional convenience wrapper
 * (use in layouts / pages)
 */
export async function getPlanningCompletionForPeriod(params: {
  clientId: string
  periodId: string
}) {
  return db.transaction(tx => getPlanningCompletionForPeriodTx(tx, params))
}
