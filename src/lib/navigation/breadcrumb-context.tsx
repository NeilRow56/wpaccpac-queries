'use client'

import React from 'react'

export interface BreadcrumbContextValue {
  periodName?: string
}

const BreadcrumbContext = React.createContext<
  [BreadcrumbContextValue, (v: BreadcrumbContextValue) => void] | undefined
>(undefined)

export function BreadcrumbProvider({
  children
}: {
  children: React.ReactNode
}) {
  const state = React.useState<BreadcrumbContextValue>({})
  return (
    <BreadcrumbContext.Provider value={state}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbContext() {
  const ctx = React.useContext(BreadcrumbContext)
  if (!ctx) {
    throw new Error(
      'useBreadcrumbContext must be used inside BreadcrumbProvider'
    )
  }
  return ctx
}
