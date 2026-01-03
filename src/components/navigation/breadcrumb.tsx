import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

// lib/navigation/breadcrumbs.ts
export type Breadcrumb = {
  label: string
  href?: string
}

// components/navigation/breadcrumb.tsx
export function Breadcrumbs({ crumbs }: { crumbs: Breadcrumb[] }) {
  if (!crumbs.length) return null

  const lastIndex = crumbs.length - 1

  return (
    <nav
      aria-label='Breadcrumb'
      className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm'
    >
      {crumbs.map((crumb, index) => {
        const isCurrent = index === lastIndex

        return (
          <span key={index} className='flex items-center gap-2'>
            {index > 0 && (
              <ChevronRight className='text-muted-foreground h-4 w-4' />
            )}

            {isCurrent || !crumb.href ? (
              <span className='text-primary font-medium'>{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className='hover:text-primary transition-colors'
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
