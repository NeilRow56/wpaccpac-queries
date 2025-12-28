'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSetSidebarSlots } from '@/components/admin/sidebar/side-bar-slots'
import { ClientSidebarContent } from '@/components/clientId/client-sidebar-slots'
import { ClientBreadcrumbs } from '@/components/clientId/client-breadcrumbs'
import { resolveClientBreadcrumbs } from '@/lib/navigation/client-breadcrumbs-resolver'
import {
  BreadcrumbProvider,
  useBreadcrumbContext
} from '@/lib/navigation/breadcrumb-context'

function ClientLayoutInner({
  children,
  clientId
}: {
  children: React.ReactNode
  clientId: string
}) {
  const pathname = usePathname()
  const setSlots = useSetSidebarSlots()
  const [breadcrumbContext] = useBreadcrumbContext()

  useEffect(() => {
    if (!setSlots) return
    setSlots({
      content: <ClientSidebarContent clientId={clientId} />
    })
    return () => setSlots({})
  }, [clientId, setSlots])

  const crumbs = resolveClientBreadcrumbs({
    clientId,
    pathname,
    periodName: breadcrumbContext.periodName
  })

  return (
    <div className='space-y-4'>
      <ClientBreadcrumbs crumbs={crumbs} />
      {children}
    </div>
  )
}

export default function ClientLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}) {
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    params.then(({ clientId }) => setClientId(clientId))
  }, [params])

  if (!clientId) return null

  return (
    <BreadcrumbProvider>
      <ClientLayoutInner clientId={clientId}>{children}</ClientLayoutInner>
    </BreadcrumbProvider>
  )
}
