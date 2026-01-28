import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'
import { getCashAtBankAccountsScheduleAction } from '@/server-actions/schedules/cash-at-bank-accounts'
import BankAccountsScheduleForm from './_components/bank-accounts-schedule-form'

function formatPeriodLabel(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric'
  })
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`
}

export default async function BankAccountsPage({
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
        label: 'Cash at bank',
        href: `/organisation/clients/${clientId}/accounting-periods/${periodId}/cash-at-bank`
      }
    ],
    leafLabel: 'Bank accounts',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/cash-at-bank/bank-accounts`
  })

  const res = await getCashAtBankAccountsScheduleAction({
    clientId,
    periodId
  })
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
        <h1 className='text-primary text-lg font-semibold'>Bank accounts</h1>
        <p className='text-muted-foreground text-sm'>
          Supporting schedule for cash at bank. Add a row for each bank account.
        </p>

        <div className='text-muted-foreground mt-2 text-sm'>
          Supporting evidence should be attached on the{' '}
          <Link
            href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/cash-at-bank`}
            className='hover:text-foreground underline underline-offset-2'
          >
            Cash at bank lead schedule
          </Link>
          .
        </div>
        <span className='text-sm text-red-600/70'>
          Enter overdraft figures as minus numbers
        </span>
      </div>

      <BankAccountsScheduleForm
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        prior={res.data.prior}
        priorPeriodLabel={priorLabel}
      />
    </div>
  )
}
