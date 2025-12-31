// lib/navigation/resolve-route-breadcrumbs.ts

import type { Breadcrumb } from './breadcrumbs'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'

interface ResolveRouteBreadcrumbsArgs {
  clientId: string
  pathname: string
}

export async function resolveRouteBreadcrumbs(
  args: ResolveRouteBreadcrumbsArgs
): Promise<Breadcrumb[]> {
  const { clientId, pathname } = args

  const crumbs: Breadcrumb[] = []

  const parts =
    pathname
      .split(`/organisation/clients/${clientId}`)
      .pop()
      ?.split('/')
      .filter(Boolean) ?? []

  console.log('BREADCRUMB PATHNAME:', pathname)
  console.log('PARTS:', parts)

  // /accounting-periods
  if (parts[0] === 'accounting-periods') {
    crumbs.push({
      label: 'Accounting Periods',
      href: `/organisation/clients/${clientId}/accounting-periods`
    })
  }

  // /accounting-periods/[periodId]
  if (parts[1]) {
    const period = await getAccountingPeriodById(parts[1])

    if (period) {
      crumbs.push({
        label: period.periodName,
        href: `/organisations/clients/${clientId}/accounting-periods/${parts[1]}`
      })
    }
  }

  return crumbs
}
