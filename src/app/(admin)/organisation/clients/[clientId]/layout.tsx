import { notFound } from 'next/navigation'
import { getClientById } from '@/server-actions/clients'

import ClientLayoutInner from './client-layout-inner'
import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import { BreadcrumbProvider } from '@/lib/navigation/breadcrumb-context'

export default async function ClientLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const client = await getClientById(clientId)

  if (!client) notFound()

  return (
    <div className='space-y-4'>
      <BreadcrumbProvider>
        {/* ✅ Breadcrumbs rendered ONCE, but listen to context */}
        <Breadcrumbs />

        {/* ✅ Everything below can register crumbs */}
        <ClientLayoutInner clientId={clientId}>{children}</ClientLayoutInner>
      </BreadcrumbProvider>
    </div>
  )
}
