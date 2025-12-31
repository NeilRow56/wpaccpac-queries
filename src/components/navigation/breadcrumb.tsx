// components/navigation/Breadcrumbs.tsx
'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useBreadcrumbContext } from '@/lib/navigation/breadcrumb-context'

export function Breadcrumbs() {
  const { crumbs } = useBreadcrumbContext()

  return (
    <nav className='text-muted-foreground flex items-center gap-2 text-sm'>
      {crumbs.map((c, i) => (
        <span key={c.href} className='flex items-center gap-2'>
          {i > 0 && <ChevronRight className='h-4 w-4' />}
          {c.isCurrentPage ? (
            <span className='text-primary font-medium'>{c.label}</span>
          ) : (
            <Link href={c.href}>{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
