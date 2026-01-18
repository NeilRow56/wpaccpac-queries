'use server'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import {
  resetChecklistResponses,
  isChecklistDocJson
} from '@/lib/planning/checklist-types'

export async function rollForwardPlanningDocsAction(input: {
  clientId: string
  fromPeriodId: string
  toPeriodId: string
  overwrite?: boolean
  resetComplete?: boolean
}) {
  const {
    clientId,
    fromPeriodId,
    toPeriodId,
    overwrite = false,
    resetComplete = true
  } = input

  if (fromPeriodId === toPeriodId) {
    return {
      success: false as const,
      error: 'From and To periods must be different'
    }
  }

  return await db.transaction(async tx => {
    const [fromPeriod, toPeriod] = await Promise.all([
      tx.query.accountingPeriods.findFirst({
        where: and(
          eq(accountingPeriods.id, fromPeriodId),
          eq(accountingPeriods.clientId, clientId)
        )
      }),
      tx.query.accountingPeriods.findFirst({
        where: and(
          eq(accountingPeriods.id, toPeriodId),
          eq(accountingPeriods.clientId, clientId)
        )
      })
    ])

    if (!fromPeriod)
      return { success: false as const, error: 'Source period not found' }
    if (!toPeriod)
      return { success: false as const, error: 'Target period not found' }

    if (toPeriod.status === 'CLOSED') {
      return {
        success: false as const,
        error: 'Cannot roll forward into a CLOSED period'
      }
    }

    const sourceDocs = await tx
      .select({
        code: planningDocs.code,
        content: planningDocs.content,
        contentJson: planningDocs.contentJson,
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
      revalidatePath(
        `/organisation/clients/${clientId}/accounting-periods/${toPeriodId}/planning`
      )
      return { success: true as const, copied: 0, overwritten: 0 }
    }

    const now = new Date()
    let overwrittenCount = 0

    for (const doc of sourceDocs) {
      const nextIsComplete = resetComplete ? false : doc.isComplete

      const nextJson =
        resetComplete && isChecklistDocJson(doc.contentJson)
          ? resetChecklistResponses(doc.contentJson)
          : doc.contentJson

      const values = {
        clientId,
        periodId: toPeriodId,
        code: doc.code,
        content: doc.content ?? '',
        contentJson: nextJson ?? null,
        isComplete: nextIsComplete,
        updatedAt: now
      }

      if (!overwrite) {
        await tx
          .insert(planningDocs)
          .values(values)
          .onConflictDoNothing({
            target: [planningDocs.periodId, planningDocs.code]
          })
      } else {
        await tx
          .insert(planningDocs)
          .values(values)
          .onConflictDoUpdate({
            target: [planningDocs.periodId, planningDocs.code],
            set: {
              content: values.content,
              contentJson: values.contentJson,
              isComplete: values.isComplete,
              updatedAt: values.updatedAt
            }
          })

        overwrittenCount += 1
      }
    }

    revalidatePath(
      `/organisation/clients/${clientId}/accounting-periods/${toPeriodId}/planning`
    )

    for (const doc of sourceDocs) {
      const encoded = encodeURIComponent(doc.code)
      revalidatePath(
        `/organisation/clients/${clientId}/accounting-periods/${toPeriodId}/planning/${encoded}`
      )
    }

    return {
      success: true as const,
      copied: sourceDocs.length,
      overwritten: overwrite ? overwrittenCount : 0
    }
  })
}
