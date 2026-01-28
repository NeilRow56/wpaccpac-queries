import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'

import Link from 'next/link'
import { getTradeCreditorsScheduleAction } from '@/server-actions/schedules/trade-creditors'
import TradeCreditorsScheduleForm from './_components/trade-creditors-schedulr-form'

function formatPeriodLabel(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric'
  })
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`
}

export default async function TradeCreditorsPage({
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
    parents: [
      {
        label: 'Purchases and Creditors',
        href: `/organisation/clients/${clientId}/accounting-periods/${periodId}/purchases-creditors`
      }
    ],
    leafLabel: 'Trade Creditors',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/purchases-creditors/trade-creditors`
  })

  const res = await getTradeCreditorsScheduleAction({ clientId, periodId })
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
        <h1 className='text-primary text-lg font-semibold'>Trade Creditors</h1>
        <p className='text-muted-foreground text-sm'>
          Supporting schedule for Trade creditors.
        </p>
        <div className='text-muted-foreground mt-2 text-sm'>
          Supporting evidence is attached on the{' '}
          <Link
            href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/purchases-creditors`}
            className='hover:text-foreground underline underline-offset-2'
          >
            Creditors lead schedule
          </Link>
          .
        </div>
      </div>

      <TradeCreditorsScheduleForm
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        prior={res.data.prior}
        priorPeriodLabel={priorLabel}
      />
    </div>
  )
}
