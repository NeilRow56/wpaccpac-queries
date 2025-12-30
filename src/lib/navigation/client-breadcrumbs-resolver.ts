import { Breadcrumb } from './breadcrumbs'

interface ResolveClientBreadcrumbsArgs {
  clientId: string
  pathname: string
  periodName?: string
}

export function resolveClientBreadcrumbs({
  clientId,
  pathname,
  periodName
}: ResolveClientBreadcrumbsArgs): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [
    {
      label: 'Current client',
      href: `/organisation/clients/${clientId}`
    }
  ]

  // Accounting periods list
  if (pathname.includes('/accounting-periods')) {
    crumbs.push({
      label: 'Accounting periods',
      href: `/organisation/clients/${clientId}/accounting-periods`
    })
  }

  // Individual accounting period
  if (periodName) {
    crumbs.push({
      label: periodName,
      href: pathname
    })
  }

  return crumbs
}
