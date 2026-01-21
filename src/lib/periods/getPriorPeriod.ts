import { and, desc, eq, lt } from 'drizzle-orm'
import { db } from '@/db'
import { accountingPeriods } from '@/db/schema/accountingPeriods'

export async function getPriorPeriodId(args: {
  clientId: string
  currentPeriodId: string
}): Promise<string | null> {
  const { clientId, currentPeriodId } = args

  const current = await db
    .select({ endDate: accountingPeriods.endDate })
    .from(accountingPeriods)
    .where(eq(accountingPeriods.id, currentPeriodId))
    .limit(1)

  const currentEndDate = current[0]?.endDate
  if (!currentEndDate) return null

  const prior = await db
    .select({ id: accountingPeriods.id })
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.clientId, clientId),
        lt(accountingPeriods.endDate, currentEndDate)
      )
    )
    .orderBy(desc(accountingPeriods.endDate))
    .limit(1)

  return prior[0]?.id ?? null
}
