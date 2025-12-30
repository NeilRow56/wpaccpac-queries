// lib/navigation/resolve-route-breadcrumbs.ts
import { ROUTE_LABELS } from './route-labels'
import type { Breadcrumb } from './breadcrumbs'

export function resolveRouteBreadcrumbs(
  pathname: string,
  baseHref = ''
): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Breadcrumb[] = []

  let href = baseHref

  for (const segment of segments) {
    href += `/${segment}`

    // Skip dynamic IDs (we’ll handle them later)
    if (segment.match(/^[a-f0-9-]{36}$/)) continue

    const label =
      ROUTE_LABELS[segment] ??
      segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    crumbs.push({
      label,
      href
    })
  }

  return crumbs
}
