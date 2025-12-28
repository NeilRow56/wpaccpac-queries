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
      title: 'Current client',
      href: `/organisation/clients/${clientId}`
    }
  ]

  // Accounting periods list
  if (pathname.includes('/accounting-periods')) {
    crumbs.push({
      title: 'Accounting periods',
      href: `/organisation/clients/${clientId}/accounting-periods`
    })
  }

  // Individual accounting period
  if (periodName) {
    crumbs.push({
      title: periodName,
      href: pathname
    })
  }

  return crumbs
}
