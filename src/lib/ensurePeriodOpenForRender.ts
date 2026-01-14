import { db } from '@/db'
import { accountingPeriods } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { assertValidTransition } from '@/domain/accounting-periods/periodStatus'

function isUniqueViolation(
  err: unknown,
  constraint?: string
): err is { code: '23505'; constraint?: string } {
  if (!err || typeof err !== 'object') return false

  const e = err as Record<string, unknown>

  if (e.code !== '23505') return false
  if (constraint && e.constraint !== constraint) return false

  return true
}

export async function ensurePeriodOpenForRender(input: {
  clientId: string
  periodId: string
}): Promise<{ promoted: boolean }> {
  const { clientId, periodId } = input

  return db.transaction(async tx => {
    // 1) Lock the target period row
    const [period] = await tx
      .select({
        id: accountingPeriods.id,
        clientId: accountingPeriods.clientId,
        status: accountingPeriods.status
      })
      .from(accountingPeriods)
      .where(
        and(
          eq(accountingPeriods.id, periodId),
          eq(accountingPeriods.clientId, clientId)
        )
      )
      .limit(1)
      .for('update')

    if (!period) throw new Error('Period not found')

    // Idempotent: already open
    if (period.status === 'OPEN') return { promoted: false }

    // 2) Fail fast if some OTHER period is already OPEN (and lock it if present)
    const existingOpenRes = await tx.execute(
      sql<{ id: string }>`
        select id
        from accounting_periods
        where client_id = ${clientId} and status = 'OPEN'
        limit 1
        for update
      `
    )

    const existingOpenId = existingOpenRes.rows[0]?.id
    if (existingOpenId && existingOpenId !== periodId) {
      throw new Error('Another period is already OPEN for this client')
    }

    // 3) Formal transition guard (PLANNED -> OPEN only)
    assertValidTransition(period.status, 'OPEN')

    // 4) Clear current flags then promote selected period
    await tx
      .update(accountingPeriods)
      .set({ isCurrent: false })
      .where(eq(accountingPeriods.clientId, clientId))

    try {
      await tx
        .update(accountingPeriods)
        .set({
          status: 'OPEN',
          isCurrent: true
        })
        .where(
          and(
            eq(accountingPeriods.id, periodId),
            eq(accountingPeriods.clientId, clientId)
          )
        )
    } catch (err) {
      if (isUniqueViolation(err, 'one_open_period_per_client_idx')) {
        throw new Error('Another period is already OPEN for this client')
      }
      throw err
    }

    // 5) Sanity invariant (keep while hardening; remove once DB constraint exists)
    const openCountRes = await tx.execute(
      sql<{ count: number }>`
        select count(*)::int as count
        from accounting_periods
        where client_id = ${clientId} and status = 'OPEN'
      `
    )

    const openCount = openCountRes.rows[0]?.count ?? 0
    if (openCount !== 1) {
      throw new Error(
        'Invariant failed: expected exactly one OPEN period for client'
      )
    }

    return { promoted: true }
  })
}
