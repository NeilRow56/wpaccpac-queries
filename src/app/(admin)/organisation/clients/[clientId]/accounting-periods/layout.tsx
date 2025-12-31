// app/organisations/clients/[clientId]/accounting-periods/layout.tsx

import { RegisterBreadcrumbs } from '@/components/navigation/register-breadcrumbs'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

export default async function AccountingPeriodsLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params

  const crumbs: Breadcrumb[] = [
    { label: 'Clients', href: '/organisation/clients' },
    {
      label: 'First Client - JS',
      href: `/organisation/clients/${clientId}`
    },
    {
      label: 'Accounting Periods',
      href: `/organisation/clients/${clientId}/accounting-periods`,
      isCurrentPage: true
    }
  ]

  return (
    <>
      <RegisterBreadcrumbs crumbs={crumbs} />
      {children}
    </>
  )
}
