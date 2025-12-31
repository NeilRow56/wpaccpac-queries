// components/navigation/register-breadcrumbs.tsx
'use client'

import { useEffect } from 'react'
import { useBreadcrumbContext } from '@/lib/navigation/breadcrumb-context'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'

export function RegisterBreadcrumbs({ crumbs }: { crumbs: Breadcrumb[] }) {
  const { setCrumbs } = useBreadcrumbContext()

  useEffect(() => {
    setCrumbs(crumbs)
  }, [crumbs, setCrumbs])

  return null
}
