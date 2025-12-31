'use client'

import { createContext, useContext, useState } from 'react'
import type { Breadcrumb } from './breadcrumbs'

type BreadcrumbContextType = {
  crumbs: Breadcrumb[]
  setCrumbs: (crumbs: Breadcrumb[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType | null>(null)

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
  if (!ctx) throw new Error('useBreadcrumbContext must be used inside provider')
  return ctx
}
