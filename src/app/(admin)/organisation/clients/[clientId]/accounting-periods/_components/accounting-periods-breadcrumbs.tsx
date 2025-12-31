'use client'

import { useRegisterBreadcrumbs } from '@/lib/use-register-breadcrumbs'

export function AccountingPeriodsBreadcrumbs({
  clientId
}: {
  clientId: string
}) {
  useRegisterBreadcrumbs([
    {
      label: 'Accounting Periods',
      href: `/organisation/clients/${clientId}/accounting-periods`
    }
  ])

  return null
}
