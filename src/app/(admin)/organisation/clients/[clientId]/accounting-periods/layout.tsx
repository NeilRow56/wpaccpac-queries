// app/organisations/clients/[clientId]/accounting-periods/layout.tsx

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
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
    {
      label: 'Accounting Periods',
      href: `/organisation/clients/${clientId}/accounting-periods`
    }
  ]

  return (
    <>
      <Breadcrumbs baseCrumbs={crumbs} />
      {children}
    </>
  )
}
