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
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const period = await getAccountingPeriodById(periodId)
  if (!period) notFound()

  const crumbs: Breadcrumb[] = [
    {
      label: period.periodName,
      href: `/organisation/clients/${clientId}/accounting-periods/${periodId}`
    }
  ]

  return (
    <>
      <Breadcrumbs baseCrumbs={crumbs} />
      {children}
    </>
  )
}
