// app/organisation/clients/[clientId]/accounting-periods/[periodId]/taxation/page.tsx

import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/navigation/breadcrumb'

import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'

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

  return (
    <div className='space-y-4'>
      <Breadcrumbs crumbs={crumbs} />

      {/* Taxation UI */}
      <h1 className='text-xl font-semibold'>Taxation</h1>

      {/* Dialog + table + forms live here */}
    </div>
  )
}
