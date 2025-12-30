// app/organisations/clients/[clientId]/layout.tsx

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'
import { getClientById } from '@/server-actions/clients'
import { notFound } from 'next/navigation'

export default async function ClientLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const client = await getClientById(clientId)

  if (!client) {
    notFound()
  }

  const baseCrumbs: Breadcrumb[] = [
    { label: 'Clients', href: '/organisations/clients' },
    {
      label: client.name,
      href: `/organisations/clients/${clientId}`
    }
  ]

  return (
    <>
      <Breadcrumbs baseCrumbs={baseCrumbs} />
      {children}
    </>
  )
}
