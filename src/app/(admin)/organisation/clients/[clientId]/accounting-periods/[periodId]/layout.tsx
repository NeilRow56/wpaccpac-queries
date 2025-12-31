// app/organisations/clients/[clientId]/accounting-periods/[periodId]/layout.tsx

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { notFound } from 'next/navigation'

export default async function PeriodLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { clientId: string; periodId: string }
}) {
  const period = await getAccountingPeriodById(params.periodId)
  if (!period) notFound()

  const crumbs: Breadcrumb[] = [
    {
      label: period.periodName,
      href: `/organisation/clients/${params.clientId}/accounting-periods/${params.periodId}`
    }
  ]

  return (
    <>
      <Breadcrumbs baseCrumbs={crumbs} />
      {children}
    </>
  )
}
