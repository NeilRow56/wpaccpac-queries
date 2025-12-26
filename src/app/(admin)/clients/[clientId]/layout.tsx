'use client'

import * as React from 'react'
import type { clients } from '@/db/schema'

type Client = typeof clients.$inferSelect

interface ClientContextValue {
  client: Client
}

const ClientContext = React.createContext<ClientContextValue | null>(null)

export function ClientContextProvider({
  client,
  children
}: {
  client: Client
  children: React.ReactNode
}) {
  return (
    <ClientContext.Provider value={{ client }}>
      {children}
    </ClientContext.Provider>
  )
}

export function useClient() {
  const context = React.useContext(ClientContext)

  if (!context) {
    throw new Error('useClient must be used within ClientContextProvider')
  }

  return context
}
