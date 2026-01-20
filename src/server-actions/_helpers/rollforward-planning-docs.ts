'use server'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

import {
  isChecklistDocJson,
  resetChecklistResponses
} from '@/lib/planning/checklist-types'
import { upgradeTitleHeadingToH1 } from '@/lib/planning/richtext-upgrades'

/**
 * Transaction type for Drizzle.
 * Compatible with: export const db = drizzle(pool, { schema })
 */
export type Tx = Parameters<(typeof db)['transaction']>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : never

export type RollForwardPlanningDocsInput = {
  clientId: string
  fromPeriodId: string
  toPeriodId: string
  overwrite?: boolean
  resetComplete?: boolean
  /** Upgrade legacy rich-text title headings (H2 -> H1) */
  upgradeHeadings?: boolean
}

/**
 * Roll planning documents forward inside an existing transaction.
 *
 * - Copies all planning docs from fromPeriod → toPeriod
 * - Optionally resets completion flags
 * - Optionally resets checklist responses
 * - Optionally upgrades legacy rich-text headings
 *
 * This function is:
 * ✅ transaction-safe
 * ✅ reusable by period-close
 * ✅ deterministic (no cache side-effects)
 */
export async function rollForwardPlanningDocsTx(
  params: { tx: Tx } & RollForwardPlanningDocsInput
) {
  const {
    tx,
    clientId,
    fromPeriodId,
    toPeriodId,
    overwrite = false,
    resetComplete = true,
    upgradeHeadings = true
  } = params

  if (fromPeriodId === toPeriodId) {
    return {
      success: false as const,
      error: 'From and To periods must be different'
    }
  }

  // Ensure both periods belong to the same client
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

  if (!fromPeriod) {
    return { success: false as const, error: 'Source period not found' }
  }

  if (!toPeriod) {
    return { success: false as const, error: 'Target period not found' }
  }

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

  const now = new Date()
  let overwrittenCount = 0

  for (const doc of sourceDocs) {
    const nextIsComplete = resetComplete ? false : doc.isComplete

    let nextJson: unknown = doc.contentJson

    // Reset checklist responses but keep structure
    if (resetComplete && isChecklistDocJson(nextJson)) {
      nextJson = resetChecklistResponses(nextJson)
    }

    // Upgrade legacy rich-text headings if requested
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
          // Must match uniqClientPeriodCode
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

  return {
    success: true as const,
    sourceCount: sourceDocs.length,
    overwritten: overwrite ? overwrittenCount : 0
  }
}
