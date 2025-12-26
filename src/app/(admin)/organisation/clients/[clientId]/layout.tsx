import { notFound, redirect } from 'next/navigation'
import { db } from '@/db'
import { clients } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUISession } from '@/lib/get-ui-session'

import { ClientContextProvider } from './client-context'

export default async function ClientLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { clientId: string }
}) {
  const { clientId } = await params

  const { session } = await getUISession()
  if (!session) redirect('/auth')

  const organizationId = session.activeOrganizationId
  if (!organizationId) redirect('/organization')

  const client = await db
    .select()
    .from(clients)
    .where(
      and(eq(clients.id, clientId), eq(clients.organizationId, organizationId))
    )
    .then(res => res[0])

  if (!client) notFound()

  return (
    <ClientContextProvider client={client}>{children}</ClientContextProvider>
  )
}
