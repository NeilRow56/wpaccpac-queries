'use client'
import { useSetSidebarSlots } from '@/components/admin/sidebar/side-bar-slots'
import { ClientSidebarContent } from '@/components/clientId/client-sidebar-slots'
import React, { useEffect } from 'react'

export default function ClientLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}) {
  const [clientId, setClientId] = React.useState<string>('')
  const setSlots = useSetSidebarSlots()

  useEffect(() => {
    params.then(({ clientId }) => {
      setClientId(clientId)
    })
  }, [params])

  useEffect(() => {
    if (clientId && setSlots) {
      setSlots({
        content: <ClientSidebarContent clientId={clientId} />
      })
    }

    // Cleanup: reset slots when unmounting
    return () => {
      setSlots?.({})
    }
  }, [clientId, setSlots])

  return <>{children}</>
}
