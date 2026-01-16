'use server'

import { db } from '@/db'
import { accountingPeriodNotes } from '@/db/schema'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const upsertNoteSchema = z.object({
  clientId: z.string().min(1),
  periodId: z.string().min(1),
  notes: z.string().max(50_000).optional().default('')
})

export async function upsertAccountingPeriodNoteAction(input: unknown) {
  try {
    const data = upsertNoteSchema.parse(input)

    // 1 row per period (periodId is PK)
    await db
      .insert(accountingPeriodNotes)
      .values({
        clientId: data.clientId,
        periodId: data.periodId,
        notes: data.notes ?? ''
      })
      .onConflictDoUpdate({
        target: accountingPeriodNotes.periodId,
        set: {
          notes: data.notes ?? '',
          updatedAt: new Date()
        }
      })

    revalidatePath(`/organisation/clients/${data.clientId}`)
    revalidatePath(`/organisation/clients/${data.clientId}/accounting-periods`)

    return { success: true as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return { success: false as const, error: message }
  }
}
