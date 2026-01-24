import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { getClientById } from '@/server-actions/clients'
import { notFound } from 'next/navigation'
import PeriodSidebar from './_components/period-sidebar'
import { getPlanningCompletionForPeriod } from '@/lib/planning/planning-completion'

type Params = { clientId: string; periodId: string }

export default async function PeriodLayout({
  params,
  children
}: {
  params: Promise<Params>
  children: React.ReactNode
}) {
  const { clientId, periodId } = await params

  const client = await getClientById(clientId)
  if (!client) notFound()

  const period = await getAccountingPeriodById(periodId)
  if (!period || period.clientId !== clientId) notFound()

  const isLocked = period.status !== 'OPEN'

  const completion = await getPlanningCompletionForPeriod({
    clientId,
    periodId
  })

  return (
    <div className='flex gap-4 xl:gap-6'>
      {/* ✅ SIDEBAR LIVES HERE */}
      <PeriodSidebar
        clientId={clientId}
        periodId={periodId}
        periodName={period.periodName}
        startDate={period.startDate}
        endDate={period.endDate}
        status={period.status}
        planningCompletion={completion}
      />

      <main className='min-w-0 flex-1'>
        {isLocked && (
          <div className='mb-3 rounded-md border p-3 text-sm'>
            This period is locked. Posting and edits are disabled.
          </div>
        )}

        {children}
      </main>
    </div>
  )
}
