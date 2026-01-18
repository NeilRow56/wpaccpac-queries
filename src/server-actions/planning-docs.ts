'use server'

import { db } from '@/db'
import { planningDocs, accountingPeriods } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getPlanningDoc(params: {
  clientId: string
  periodId: string
  code: string
}) {
  const { clientId, periodId, code } = params

  // Ensure period belongs to client (safety)
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
        eq(planningDocs.clientId, clientId), // ✅ add this
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

  // Ensure period belongs to client (safety)
  const period = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.id, periodId),
      eq(accountingPeriods.clientId, clientId)
    )
  })
  if (!period) {
    return { success: false as const, error: 'Period not found for client' }
  }

  // Rule: only editable when OPEN
  if (period.status !== 'OPEN') {
    return {
      success: false as const,
      error: `Period is ${period.status}. Edits are disabled.`
    }
  }

  // Only update the fields that were provided (prevents wiping).
  const set: Partial<typeof planningDocs.$inferInsert> = {
    isComplete,
    updatedAt: new Date()
  }

  if (typeof input.content === 'string') {
    set.content = input.content
  }

  if (input.contentJson !== undefined) {
    set.contentJson = input.contentJson
  }

  await db
    .insert(planningDocs)
    .values({
      clientId,
      periodId,
      code,
      content: typeof input.content === 'string' ? input.content : '',
      contentJson: input.contentJson ?? null,
      isComplete
    })
    .onConflictDoUpdate({
      target: [planningDocs.periodId, planningDocs.code],
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

export async function setPlanningDocCompleteAction(input: {
  clientId: string
  periodId: string
  code: string
  isComplete: boolean
}) {
  const existing = await getPlanningDoc({
    clientId: input.clientId,
    periodId: input.periodId,
    code: input.code
  })

  return upsertPlanningDocAction({
    clientId: input.clientId,
    periodId: input.periodId,
    code: input.code,
    content: existing?.content,
    contentJson: existing?.contentJson,
    isComplete: input.isComplete
  })
}
