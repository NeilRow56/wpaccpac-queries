'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useBreadcrumbContext } from '@/lib/navigation/breadcrumb-context'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

export function RegisterBreadcrumbs({ crumbs }: { crumbs: Breadcrumb[] }) {
  const { setCrumbs } = useBreadcrumbContext()
  const pathname = usePathname()

  useEffect(() => {
    setCrumbs(crumbs)
  }, [pathname, crumbs, setCrumbs])

  return null
}
