// lib/periods/ensurePeriodOpen.ts (or in same file, not exported as action)
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import {
  accountingPeriods as accountingPeriodsTable,
  PeriodStatus
} from '@/db/schema'

export async function ensurePeriodOpenForRender(input: {
  clientId: string
  periodId: string
}): Promise<{
  promoted: boolean
  status: 'PLANNED' | 'OPEN' | 'CLOSED' | 'CLOSING'
}> {
  return await db.transaction(async tx => {
    const period = await tx.query.accountingPeriods.findFirst({
      where: and(
        eq(accountingPeriodsTable.id, input.periodId),
        eq(accountingPeriodsTable.clientId, input.clientId)
      )
    })

    if (!period) throw new Error('Accounting period not found')
    if (period.status === 'CLOSED') return { promoted: false, status: 'CLOSED' }

    if (period.status === 'PLANNED') {
      await tx
        .update(accountingPeriodsTable)
        .set({ isCurrent: false })
        .where(eq(accountingPeriodsTable.clientId, input.clientId))

      await tx
        .update(accountingPeriodsTable)
        .set({ status: 'OPEN', isOpen: true, isCurrent: true })
        .where(eq(accountingPeriodsTable.id, input.periodId))

      return { promoted: true, status: 'OPEN' }
    }

    return { promoted: false, status: period.status as PeriodStatus }
  })
}
