// lib/navigation/breadcrumb-context.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import type { Breadcrumb } from './breadcrumbs'

type BreadcrumbContextValue = {
  crumbs: Breadcrumb[]
  setCrumbs: (crumbs: Breadcrumb[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

export function BreadcrumbProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [crumbs, setCrumbs] = useState<Breadcrumb[]>([])
  return (
    <BreadcrumbContext.Provider value={{ crumbs, setCrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext)
  if (!ctx) throw new Error('BreadcrumbProvider missing')
  return ctx
}
