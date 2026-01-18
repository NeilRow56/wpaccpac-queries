import { and, eq } from 'drizzle-orm'
import { planningDocs } from '@/db/schema'

type Tx = Parameters<(typeof import('@/db').db)['transaction']>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never

export async function rollForwardPlanningDocsTx(params: {
  tx: Tx
  clientId: string
  fromPeriodId: string
  toPeriodId: string
  overwrite?: boolean
  resetComplete?: boolean
}) {
  const {
    tx,
    clientId,
    fromPeriodId,
    toPeriodId,
    overwrite = false,
    resetComplete = true
  } = params

  if (fromPeriodId === toPeriodId) {
    return { copied: 0, overwritten: 0 }
  }

  const sourceDocs = await tx
    .select({
      code: planningDocs.code,
      content: planningDocs.content,
      isComplete: planningDocs.isComplete
    })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, clientId),
        eq(planningDocs.periodId, fromPeriodId)
      )
    )

  if (sourceDocs.length === 0) {
    return { copied: 0, overwritten: 0 }
  }

  const now = new Date()
  let overwrittenCount = 0

  for (const doc of sourceDocs) {
    const nextIsComplete = resetComplete ? false : doc.isComplete

    if (!overwrite) {
      await tx
        .insert(planningDocs)
        .values({
          clientId,
          periodId: toPeriodId,
          code: doc.code,
          content: doc.content ?? '',
          isComplete: nextIsComplete,
          updatedAt: now
        })
        .onConflictDoNothing({
          target: [planningDocs.periodId, planningDocs.code]
        })
    } else {
      await tx
        .insert(planningDocs)
        .values({
          clientId,
          periodId: toPeriodId,
          code: doc.code,
          content: doc.content ?? '',
          isComplete: nextIsComplete,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: [planningDocs.periodId, planningDocs.code],
          set: {
            content: doc.content ?? '',
            isComplete: nextIsComplete,
            updatedAt: now
          }
        })

      overwrittenCount += 1
    }
  }

  return {
    sourceCount: sourceDocs.length,
    overwritten: overwrite ? overwrittenCount : 0
  }
}
