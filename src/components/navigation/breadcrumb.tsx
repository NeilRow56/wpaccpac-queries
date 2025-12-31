'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ROUTE_LABELS } from '@/lib/navigation/route-labels'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

interface BreadcrumbsProps {
  baseCrumbs: Breadcrumb[]
}

export function Breadcrumbs({ baseCrumbs }: BreadcrumbsProps) {
  const pathname = usePathname()

  const baseHref: string =
    baseCrumbs.length === 0 ? '' : baseCrumbs[baseCrumbs.length - 1].href

  const dynamicCrumbs = buildRouteCrumbs(pathname, baseHref)
  const crumbs = [...baseCrumbs, ...dynamicCrumbs]

  return (
    <nav className='flex items-center gap-1 overflow-x-auto text-sm whitespace-nowrap'>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className='flex items-center gap-1'>
          {i > 0 && (
            <ChevronRight className='text-muted-foreground/70 h-4 w-4 shrink-0' />
          )}
          <Link
            href={crumb.href}
            className='hover:text-foreground max-w-[250px] truncate'
            title={crumb.label}
          >
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}

function buildRouteCrumbs(pathname: string, baseHref: string): Breadcrumb[] {
  if (!pathname.startsWith(baseHref)) return []

  const relative = pathname.slice(baseHref.length)
  const segments = relative.split('/').filter(Boolean)

  let href = baseHref
  const crumbs: Breadcrumb[] = []

  for (const segment of segments) {
    href += `/${segment}`

    // Skip UUIDs (resolved later)
    if (/^[a-f0-9-]{36}$/.test(segment)) continue

    const label =
      ROUTE_LABELS[segment] ??
      segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    crumbs.push({ label, href })
  }

  return crumbs
}
