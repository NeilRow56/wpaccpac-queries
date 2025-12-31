// app/organisations/clients/[clientId]/layout.tsx

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'
import { resolveRouteBreadcrumbs } from '@/lib/navigation/resolve-route-breadcrumbs'
import { getClientById } from '@/server-actions/clients'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'

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

  // ✅ REQUIRED in Next.js 16
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''

  // Base crumbs (always present)
  const baseCrumbs: Breadcrumb[] = [
    { label: 'Clients', href: '/organisation/clients' },
    {
      label: client.name,
      href: `/organisation/clients/${clientId}`
    }
  ]

  // ✅ Route-aware crumbs
  const routeCrumbs = await resolveRouteBreadcrumbs({
    clientId,
    pathname
  })

  return (
    <>
      <Breadcrumbs baseCrumbs={[...baseCrumbs, ...routeCrumbs]} />
      {children}
    </>
  )
}
