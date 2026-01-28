import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'

import Link from 'next/link'
import { getVatAndOtherTaxesScheduleAction } from '@/server-actions/schedules/vat-and-other-taxes'
import VatAndOtherTaxesScheduleForm from './_components/vat-and-other-taxes-schedule-form'

function formatPeriodLabel(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric'
  })
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`
}

export default async function VatAndOtherTaxesPage({
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
        label: 'Puchases and Creditors',
        href: `/organisation/clients/${clientId}/accounting-periods/${periodId}/purchases-creditors`
      }
    ],
    leafLabel: 'VAT and other taxes',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/puchases-creditors/vat-and-other-taxes`
  })

  const res = await getVatAndOtherTaxesScheduleAction({ clientId, periodId })
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
        <h1 className='text-primary text-lg font-semibold'>
          VAT and other taxes
        </h1>
        <p className='text-muted-foreground text-sm'>
          Supporting schedules for VAT and other taxes.
        </p>
        <div className='text-muted-foreground mt-2 text-sm'>
          Supporting evidence should be attached on the{' '}
          <Link
            href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/purchases-creditors`}
            className='hover:text-foreground underline underline-offset-2'
          >
            Creditors lead schedule
          </Link>
          .
        </div>
      </div>

      <VatAndOtherTaxesScheduleForm
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        prior={res.data.prior}
        priorPeriodLabel={priorLabel}
      />
    </div>
  )
}
