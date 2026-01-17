import { db } from '@/db'
import { accountingPeriods, PeriodStatus } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { PlanningClient } from './_components/planning-client'

export default async function PlanningPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const period = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.id, periodId),
      eq(accountingPeriods.clientId, clientId)
    )
  })

  if (!period) {
    return (
      <div className='rounded-md border border-red-300 bg-red-50 p-4 text-sm'>
        Period not found.
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-primary text-xl font-bold'>Planning</h1>

      <PlanningClient
        clientId={clientId}
        periodId={periodId}
        status={period.status as PeriodStatus} // ideally import your PeriodStatus type instead of any
      />
    </div>
  )
}
