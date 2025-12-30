// components/navigation/breadcrumbs.tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ROUTE_LABELS } from '@/lib/navigation/route-labels'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

interface BreadcrumbsProps {
  baseCrumbs: Breadcrumb[]
}

function buildRouteCrumbs(pathname: string, baseHref: string): Breadcrumb[] {
  const segments = pathname.replace(baseHref, '').split('/').filter(Boolean)

  let href = baseHref
  const crumbs: Breadcrumb[] = []

  for (const segment of segments) {
    href += `/${segment}`

    // Skip UUIDs for now (we’ll resolve dynamically later)
    if (/^[a-f0-9-]{36}$/.test(segment)) continue

    const label =
      ROUTE_LABELS[segment] ??
      segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    crumbs.push({ label, href })
  }

  return crumbs
}

export function Breadcrumbs({ baseCrumbs }: BreadcrumbsProps) {
  const pathname = usePathname()

  const baseHref =
    baseCrumbs.length > 0 ? baseCrumbs[baseCrumbs.length - 1].href : ''

  const dynamicCrumbs = buildRouteCrumbs(pathname, baseHref)

  const crumbs = [...baseCrumbs, ...dynamicCrumbs]

  return (
    <nav className='text-muted-foreground flex items-center text-sm'>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className='flex items-center gap-1'>
          {i > 0 && <ChevronRight className='h-4 w-4' />}
          <Link href={crumb.href} className='hover:text-foreground'>
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}
