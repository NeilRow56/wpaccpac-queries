'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

export function ClientBreadcrumbs({ crumbs }: { crumbs: Breadcrumb[] }) {
  if (!crumbs.length) return null

  return (
    <nav
      aria-label='Breadcrumb'
      className='text-muted-foreground flex items-center gap-1 text-sm'
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1

        return (
          <span key={crumb.href} className='flex items-center gap-1'>
            {index > 0 && (
              <ChevronRight className='text-muted-foreground/60 h-4 w-4' />
            )}

            {isLast ? (
              <span className='text-foreground font-medium'>{crumb.title}</span>
            ) : (
              <Link
                href={crumb.href}
                className='hover:text-foreground transition-colors'
              >
                {crumb.title}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
