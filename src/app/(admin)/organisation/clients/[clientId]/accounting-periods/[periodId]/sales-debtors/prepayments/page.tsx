import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'

import { getDebtorsPrepaymentsScheduleAction } from '@/server-actions/schedules/debtors-prepayments'
import PrepaymentsScheduleForm from './_components/prepayments-schedule-form'

function formatPeriodLabel(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric'
  })
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`
}

export default async function PrepaymentsPage({
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
    leafLabel: 'Prepayments',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/sales-debtors/prepayments`
  })

  const res = await getDebtorsPrepaymentsScheduleAction({ clientId, periodId })
  if (!res.success) notFound()

  const priorLabel = res.data.priorPeriod
    ? formatPeriodLabel(
        res.data.priorPeriod.startDate,
        res.data.priorPeriod.endDate
      )
    : 'Prior year'

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <Breadcrumbs crumbs={crumbs} />

      <div>
        <h1 className='text-primary text-lg font-semibold'>Prepayments</h1>
        <p className='text-muted-foreground text-sm'>
          Supporting schedule for Sales debtors.
        </p>
      </div>

      <PrepaymentsScheduleForm
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        prior={res.data.prior}
        priorPeriodLabel={priorLabel}
      />
    </div>
  )
}
