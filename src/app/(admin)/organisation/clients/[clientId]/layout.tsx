import { notFound } from 'next/navigation'
import { getClientById } from '@/server-actions/clients'

import ClientLayoutInner from './client-layout-inner'

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
      <ClientLayoutInner clientId={clientId}>{children}</ClientLayoutInner>
    </div>
  )
}
