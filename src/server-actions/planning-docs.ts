'use server'

import { db } from '@/db'
import { planningDocs, accountingPeriods } from '@/db/schema'
import { buildChecklistDocFromDefaults } from '@/lib/planning/checklist-types'
import { upgradeTitleHeadingToH1 } from '@/lib/planning/richtext-upgrades'
import { B_DOCS } from '@/planning/registry'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { PlanningDocDef } from '@/planning/types'

type RichTextDef = Extract<PlanningDocDef, { type: 'RICH_TEXT' }>

function isRichTextDef(def: PlanningDocDef): def is RichTextDef {
  return def.type === 'RICH_TEXT'
}

export async function getPlanningDoc(params: {
  clientId: string
  periodId: string
  code: string
}) {
  const { clientId, periodId, code } = params

  const period = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.id, periodId),
      eq(accountingPeriods.clientId, clientId)
    )
  })
  if (!period) return null

  const row = await db
    .select({
      id: planningDocs.id,
      content: planningDocs.content,
      contentJson: planningDocs.contentJson,
      isComplete: planningDocs.isComplete,
      updatedAt: planningDocs.updatedAt
    })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, clientId),
        eq(planningDocs.periodId, periodId),
        eq(planningDocs.code, code)
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  return row
}

export async function upsertPlanningDocAction(input: {
  clientId: string
  periodId: string
  code: string
  content?: string
  contentJson?: unknown
  isComplete?: boolean
}) {
  const { clientId, periodId, code } = input
  const isComplete = input.isComplete ?? false

  const period = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.id, periodId),
      eq(accountingPeriods.clientId, clientId)
    )
  })
  if (!period) {
    return { success: false as const, error: 'Period not found for client' }
  }

  if (period.status !== 'OPEN') {
    return {
      success: false as const,
      error: `Period is ${period.status}. Edits are disabled.`
    }
  }

  // Only set what was provided
  const set: Partial<typeof planningDocs.$inferInsert> = {
    isComplete,
    updatedAt: new Date()
  }

  if (typeof input.content === 'string') set.content = input.content
  if (input.contentJson !== undefined) set.contentJson = input.contentJson

  // IMPORTANT: values should also only include provided fields (don’t force ''/null)
  const values: typeof planningDocs.$inferInsert = {
    clientId,
    periodId,
    code,
    isComplete,
    updatedAt: new Date(),
    ...(typeof input.content === 'string' ? { content: input.content } : {}),
    ...(input.contentJson !== undefined
      ? { contentJson: input.contentJson }
      : {})
  }

  await db
    .insert(planningDocs)
    .values(values)
    .onConflictDoUpdate({
      target: [planningDocs.clientId, planningDocs.periodId, planningDocs.code],
      set
    })

  const encoded = encodeURIComponent(code)
  revalidatePath(
    `/organisation/clients/${clientId}/accounting-periods/${periodId}/planning`
  )
  revalidatePath(
    `/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/${encoded}`
  )

  return { success: true as const }
}

// server-actions/planning-docs-reset.ts

export async function resetPlanningDocToTemplateAction(input: {
  clientId: string
  periodId: string
  code: string
}) {
  const { clientId, periodId, code } = input

  const period = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.id, periodId),
      eq(accountingPeriods.clientId, clientId)
    )
  })
  if (!period) return { success: false as const, error: 'Period not found' }

  if (period.status !== 'OPEN') {
    return {
      success: false as const,
      error: `Period is ${period.status}. Reset is disabled.`
    }
  }

  const def = B_DOCS.find(d => d.code === code) as PlanningDocDef | undefined

  if (!def)
    return { success: false as const, error: `Unknown doc code: ${code}` }

  const now = new Date()

  let content = ''
  let contentJson: unknown = null

  if (def.type === 'TEXT' || def.type === 'NOTES') {
    content = def.defaultText ?? ''
    contentJson = null
  } else if (def.type === 'CHECKLIST') {
    content = ''
    contentJson = buildChecklistDocFromDefaults(def.defaultChecklist)
  } else if (isRichTextDef(def)) {
    content = ''
    contentJson = upgradeTitleHeadingToH1(def.defaultContentJson)
  } else {
    return {
      success: false as const,
      error: `Unsupported doc type: ${(def as PlanningDocDef).type}`
    }
  }

  await db
    .insert(planningDocs)
    .values({
      clientId,
      periodId,
      code,
      content,
      contentJson,
      isComplete: false,
      updatedAt: now
    })
    .onConflictDoUpdate({
      // IMPORTANT: after you change schema unique index
      target: [planningDocs.clientId, planningDocs.periodId, planningDocs.code],
      set: {
        content,
        contentJson,
        isComplete: false,
        updatedAt: now
      }
    })

  const encoded = encodeURIComponent(code)
  revalidatePath(
    `/organisation/clients/${clientId}/accounting-periods/${periodId}/planning`
  )
  revalidatePath(
    `/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/${encoded}`
  )

  return {
    success: true as const,
    content,
    contentJson
  }
}
