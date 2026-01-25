// src/server-actions/_helpers/rollforward-planning-docs.ts
'use server'

import { db } from '@/db'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

import { resetLineItemScheduleForNewPeriod } from '@/lib/schedules/reset-line-item-schedule'
import type { LineItemScheduleDocV1 } from '@/lib/schedules/lineItemScheduleTypes'

import {
  tryReadPeriodSetup,
  resetPeriodSetupForNewPeriod
} from '@/lib/periods/reset-period-setup'

import {
  isChecklistDocJson,
  resetChecklistResponses
} from '@/lib/planning/checklist-types'
import { upgradeTitleHeadingToH1 } from '@/lib/planning/richtext-upgrades'

import { isSimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'
import { resetSimpleScheduleForNewPeriod } from '@/lib/schedules/reset-simple-schedule'

function isLineItemScheduleDocV1(v: unknown): v is LineItemScheduleDocV1 {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return (
    r.kind === 'LINE_ITEM_SCHEDULE' && r.version === 1 && Array.isArray(r.rows)
  )
}

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
const PERIOD_SETUP_CODE = 'B00-period_setup'

const LINE_ITEM_SCHEDULE_CODES_TO_RESET = new Set<string>([
  'B61-debtors_prepayments'
  // add trade debtors schedule code later
])

/**
 * Codes where we copy structure but reset the *data entry* fields.
 * (We do NOT want last year's inputs in the new period.)
 */
const SIMPLE_SCHEDULE_CODES_TO_RESET = new Set<string>([
  'B61-taxation',
  'B61-debtors',
  'B61-trade_debtors'
  // add more SIMPLE_SCHEDULE codes here as you implement them
])

/**
 * Roll planning documents forward inside an existing transaction.
 *
 * - Copies all planning docs from fromPeriod → toPeriod
 * - Optionally resets completion flags
 * - Optionally resets checklist responses
 * - Optionally upgrades legacy rich-text headings
 * - ✅ For whitelisted SIMPLE_SCHEDULE codes, clears INPUT amounts + notes + attachment urls
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

    // ✅ Reset Period Setup values for the new period
    if (resetComplete && doc.code === PERIOD_SETUP_CODE) {
      const parsed = tryReadPeriodSetup(nextJson)
      if (parsed.ok) {
        nextJson = resetPeriodSetupForNewPeriod(parsed.doc)
      }
    }

    // ✅ Reset SIMPLE_SCHEDULE values for the new period (whitelist)
    if (
      resetComplete &&
      SIMPLE_SCHEDULE_CODES_TO_RESET.has(doc.code) &&
      isSimpleScheduleDocV1(nextJson)
    ) {
      nextJson = resetSimpleScheduleForNewPeriod(nextJson)
    }

    if (
      resetComplete &&
      LINE_ITEM_SCHEDULE_CODES_TO_RESET.has(doc.code) &&
      isLineItemScheduleDocV1(nextJson)
    ) {
      nextJson = resetLineItemScheduleForNewPeriod(nextJson)
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
