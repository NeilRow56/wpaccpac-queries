'use server'

import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { planningDocs } from '@/db/schema'

import { normalizePeriodSetup } from '@/lib/periods/period-setup'
import { renderB41MaterialityMarkdown } from '@/lib/materiality/render'

const PERIOD_SETUP_CODE = 'B00-period_setup'
const MATERIALITY_CODE = 'B41'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

// Keep this local so the action compiles even if you haven’t created a shared doc type yet.
type MaterialityDocV1 = {
  kind: 'MATERIALITY'
  version: 1
  generatedMarkdown: string
  generatedAt: string // ISO
}

export async function generateMaterialityScheduleAction(input: {
  clientId: string
  periodId: string
}): Promise<ActionResult<null>> {
  try {
    // 1) Load Period Setup (B00)
    const setupRow = await db
      .select({ contentJson: planningDocs.contentJson })
      .from(planningDocs)
      .where(
        and(
          eq(planningDocs.clientId, input.clientId),
          eq(planningDocs.periodId, input.periodId),
          eq(planningDocs.code, PERIOD_SETUP_CODE)
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    const setup = setupRow?.contentJson
      ? normalizePeriodSetup(setupRow.contentJson)
      : null

    if (!setup) {
      return {
        success: false,
        message: 'Period setup (B00) not found or invalid.'
      }
    }

    const turnoverCurrent = setup.materiality.turnover.current
    const netProfitCurrent = setup.materiality.netProfit.current
    const turnoverPrior = setup.materiality.turnover.prior
    const netProfitPrior = setup.materiality.netProfit.prior

    // 2) Generate the schedule markdown (calc + render in one place)
    const generatedMarkdown = renderB41MaterialityMarkdown({
      turnoverCurrent,
      netProfitCurrent,
      turnoverPrior,
      netProfitPrior
    })

    const now = new Date()

    const materialityDoc: MaterialityDocV1 = {
      kind: 'MATERIALITY',
      version: 1,
      generatedMarkdown,
      generatedAt: now.toISOString()
    }

    // 3) Preserve any existing user notes stored in `content`
    const existing = await db
      .select({ content: planningDocs.content })
      .from(planningDocs)
      .where(
        and(
          eq(planningDocs.clientId, input.clientId),
          eq(planningDocs.periodId, input.periodId),
          eq(planningDocs.code, MATERIALITY_CODE)
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    const notes = existing?.content ?? ''

    // 4) Upsert B41:
    //    - contentJson: generated schedule
    //    - content: user notes (preserved)
    await db
      .insert(planningDocs)
      .values({
        clientId: input.clientId,
        periodId: input.periodId,
        code: MATERIALITY_CODE,
        content: notes,
        contentJson: materialityDoc,
        isComplete: false,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [
          planningDocs.clientId,
          planningDocs.periodId,
          planningDocs.code
        ],
        set: {
          content: notes,
          contentJson: materialityDoc,
          updatedAt: now
        }
      })

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to generate materiality'
    }
  }
}
