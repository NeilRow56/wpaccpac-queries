// app/organisations/clients/[clientId]/accounting-periods/[periodId]/taxation/page.tsx
import { RegisterBreadcrumbs } from '@/components/navigation/register-breadcrumbs'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

export default async function TaxationPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params
  const period = await getAccountingPeriodById(periodId)

  const crumbs: Breadcrumb[] = [
    { label: 'Clients', href: '/organisation/clients' },
    {
      label: 'First Client - JS',
      href: `/organisation/clients/${clientId}`
    },
    {
      label: 'Accounting Periods',
      href: `/organisation/clients/${clientId}/accounting-periods`
    },
    {
      label: period?.periodName ?? 'Accounting Period',
      href: `/organisation/clients/${clientId}/accounting-periods/${periodId}`
    },
    {
      label: 'Taxation',
      href: `/organisation/clients/${clientId}/accounting-periods/${periodId}/taxation`,
      isCurrentPage: true
    }
  ]

  return (
    <>
      <RegisterBreadcrumbs crumbs={crumbs} />
      <h1 className='text-3xl font-bold'>Taxation</h1>
    </>
  )
}
