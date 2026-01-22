// src/server-actions/period-setup.ts
'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { planningDocs } from '@/db/schema'

import {
  applyPeriodSetupHistory,
  normalizePeriodSetup,
  periodSetupDefault,
  type PeriodSetupDocV1
} from '@/lib/periods/period-setup'

const CODE = 'B00-period_setup'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

export async function getPeriodSetupAction(input: {
  clientId: string
  periodId: string
}): Promise<ActionResult<PeriodSetupDocV1>> {
  try {
    const row = await db
      .select({ id: planningDocs.id, contentJson: planningDocs.contentJson })
      .from(planningDocs)
      .where(
        and(
          eq(planningDocs.clientId, input.clientId),
          eq(planningDocs.periodId, input.periodId),
          eq(planningDocs.code, CODE)
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    const normalized = row?.contentJson
      ? normalizePeriodSetup(row.contentJson)
      : null

    const doc = normalized ?? periodSetupDefault()

    // Seed if missing (stable backing row for UI)
    if (!row) {
      await db
        .insert(planningDocs)
        .values({
          clientId: input.clientId,
          periodId: input.periodId,
          code: CODE,
          content: '',
          contentJson: doc,
          isComplete: false
        })
        .onConflictDoNothing({
          target: [
            planningDocs.clientId,
            planningDocs.periodId,
            planningDocs.code
          ]
        })
    }

    return { success: true, data: doc }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to load period setup'
    }
  }
}

export async function savePeriodSetupAction(input: {
  clientId: string
  periodId: string
  doc: PeriodSetupDocV1
}): Promise<ActionResult<null>> {
  try {
    // Pull previous so we can maintain history on change
    const existing = await db
      .select({ contentJson: planningDocs.contentJson })
      .from(planningDocs)
      .where(
        and(
          eq(planningDocs.clientId, input.clientId),
          eq(planningDocs.periodId, input.periodId),
          eq(planningDocs.code, CODE)
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    const prev =
      existing?.contentJson != null
        ? normalizePeriodSetup(existing.contentJson)
        : null

    const basePrev = prev ?? periodSetupDefault()

    // Defensive: normalise what we were handed too (in case UI/client gets stale)
    const normalizedNext = normalizePeriodSetup(input.doc) ?? input.doc

    const docToSave = applyPeriodSetupHistory(basePrev, normalizedNext)

    await db
      .insert(planningDocs)
      .values({
        clientId: input.clientId,
        periodId: input.periodId,
        code: CODE,
        content: '',
        contentJson: docToSave,
        isComplete: false
      })
      .onConflictDoUpdate({
        target: [
          planningDocs.clientId,
          planningDocs.periodId,
          planningDocs.code
        ],
        set: { contentJson: docToSave, updatedAt: new Date() }
      })

    revalidatePath(
      `/organisation/clients/${input.clientId}/accounting-periods/${input.periodId}/planning`
    )

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to save period setup'
    }
  }
}
