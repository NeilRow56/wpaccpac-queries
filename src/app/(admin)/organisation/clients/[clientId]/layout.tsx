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
  params: { clientId: string }
}) {
  const client = await getClientById(params.clientId)

  if (!client) {
    notFound()
  }

  const baseCrumbs: Breadcrumb[] = [
    { label: 'Clients', href: '/organisations/clients' },
    {
      label: client.name,
      href: `/organisations/clients/${params.clientId}`
    }
  ]

  return (
    <>
      <Breadcrumbs baseCrumbs={baseCrumbs} />
      {children}
    </>
  )
}
