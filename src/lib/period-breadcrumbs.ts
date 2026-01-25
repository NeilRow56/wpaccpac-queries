import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

export function buildPeriodLeafBreadcrumbs(params: {
  clientId: string
  clientName: string
  periodId: string
  periodName: string
  leafLabel: string
  leafHref: string
  parents?: Breadcrumb[] // optional intermediate crumbs
}): Breadcrumb[] {
  const {
    clientId,
    clientName,
    periodId,
    periodName,
    leafLabel,
    leafHref,
    parents = []
  } = params

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
    ...parents,
    {
      label: leafLabel,
      href: leafHref
    }
  ]
}
