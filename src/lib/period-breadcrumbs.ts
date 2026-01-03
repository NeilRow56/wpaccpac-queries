import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

export function buildPeriodLeafBreadcrumbs(params: {
  clientId: string
  clientName: string
  periodId: string
  periodName: string
  leafLabel: string
  leafHref: string
}): Breadcrumb[] {
  const { clientId, clientName, periodId, periodName, leafLabel, leafHref } =
    params

  return [
    { label: 'Clients', href: '/organisation/clients' },
    {
      label: clientName,
      href: `/organisation/clients/${clientId}`
    },
    {
      label: 'Accounting Periods',
      href: `/organisation/clients/${clientId}/accounting-periods`
    },
    {
      label: periodName,
      href: `/organisation/clients/${clientId}/accounting-periods/${periodId}`
    },
    {
      label: leafLabel,
      href: leafHref
    }
  ]
}
