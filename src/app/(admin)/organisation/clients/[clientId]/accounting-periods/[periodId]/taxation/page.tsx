// app/organisation/clients/[clientId]/accounting-periods/[periodId]/taxation/page.tsx

import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/navigation/breadcrumb'

import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'
import SimpleScheduleForm from './_components/simple-schedule-form'
import { getTaxationScheduleAction } from '@/server-actions/simple-schedules/taxation'
import { Calendar } from 'lucide-react'
import { accountingPeriods } from '@/db/schema'
import { db } from '@/db'
import { and, desc, eq, lt } from 'drizzle-orm'

export default async function TaxationPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const client = await getClientById(clientId)
  const period = await getAccountingPeriodById(periodId)

  if (!client || !period) notFound()

  const crumbs = buildPeriodLeafBreadcrumbs({
    clientId,
    clientName: client.name,
    periodId,
    periodName: period.periodName,
    leafLabel: 'Taxation',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/taxation`
  })

  const priorPeriod = await db
    .select()
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.clientId, clientId),
        lt(accountingPeriods.endDate, period.startDate)
      )
    )
    .orderBy(desc(accountingPeriods.endDate))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!period || period.id !== periodId) {
    return (
      <div className='mb-4 rounded-lg border p-4'>
        <Breadcrumbs crumbs={crumbs} />
        <div className='flex items-start gap-3'>
          <Calendar className='text-muted-foreground h-5 w-5' />
          <div>
            <p className='font-medium text-red-600'>
              No open accounting period
            </p>
            <p className='text-muted-foreground text-sm'>
              You must have the selected accounting period open to edit
              taxation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const res = await getTaxationScheduleAction({ clientId, periodId })

  if (!res.success) {
    notFound()
  }

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <Breadcrumbs crumbs={crumbs} />
      <div>
        <h2 className='text-primary text-lg font-bold'>Taxation</h2>
        <p className='text-muted-foreground mt-1 text-sm'>
          Enter current-year taxation figures. Prior-year comparatives are shown
          for reference.
        </p>
      </div>

      <SimpleScheduleForm
        title='Taxation'
        code='B61-taxation'
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        prior={res.data.prior}
        priorPeriod={priorPeriod}
      />
    </div>
  )
}
