'use server'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { upgradeTitleHeadingToH1 } from '@/lib/planning/richtext-upgrades' // from earlier snippet
import {
  isChecklistDocJson,
  resetChecklistResponses
} from '@/lib/planning/checklist-types'

export async function rollForwardPlanningDocsAction(input: {
  clientId: string
  fromPeriodId: string
  toPeriodId: string
  overwrite?: boolean
  resetComplete?: boolean
  /** upgrades legacy rich-text title headings (H2 -> H1) on rollforward */
  upgradeHeadings?: boolean
}) {
  const {
    clientId,
    fromPeriodId,
    toPeriodId,
    overwrite = false,
    resetComplete = true,
    upgradeHeadings = true
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

      let nextJson: unknown = doc.contentJson

      // Reset checklist responses on rollforward (but keep the checklist itself)
      if (resetComplete && isChecklistDocJson(nextJson)) {
        nextJson = resetChecklistResponses(nextJson)
      }

      // Optional: upgrade legacy rich-text title headings (H2->H1)
      if (upgradeHeadings) {
        nextJson = upgradeTitleHeadingToH1(nextJson)
      }

      const values: typeof planningDocs.$inferInsert = {
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
            // IMPORTANT: must match your unique index
            target: [
              planningDocs.clientId,
              planningDocs.periodId,
              planningDocs.code
            ]
          })
      } else {
        await tx
          .insert(planningDocs)
          .values(values)
          .onConflictDoUpdate({
            // IMPORTANT: must match your unique index
            target: [
              planningDocs.clientId,
              planningDocs.periodId,
              planningDocs.code
            ],
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

    // Revalidate each doc page too
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
