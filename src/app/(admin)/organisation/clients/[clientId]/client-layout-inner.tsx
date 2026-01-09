// app/organisations/clients/[clientId]/client-layout-inner.tsx
'use client'

import { useEffect } from 'react'
import { useSetSidebarSlots } from '@/components/admin/sidebar/side-bar-slots'
import { ClientSidebarContent } from '@/components/clientId/client-sidebar-slots'

export default function ClientLayoutInner({
  children,
  clientId
}: {
  children: React.ReactNode
  clientId: string
}) {
  const setSlots = useSetSidebarSlots()

  useEffect(() => {
    if (!setSlots) return

    setSlots({
      content: <ClientSidebarContent clientId={clientId} />
    })

    return () => setSlots({})
  }, [clientId, setSlots])

  return <div>{children}</div>
}
