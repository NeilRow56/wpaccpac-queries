// app/organisations/clients/[clientId]/accounting-periods/layout.tsx

import { getClientById } from '@/server-actions/clients'
import { notFound } from 'next/navigation'

export default async function AccountingPeriodsLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const client = await getClientById(clientId)

  if (!client) notFound()

  return <>{children}</>
}
