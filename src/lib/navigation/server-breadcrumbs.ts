// lib/navigation/server-breadcrumbs.ts
import { db } from '@/db'
import { clients, accountingPeriods } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Breadcrumb } from './breadcrumbs'

type Params = {
  clientId: string
  periodId?: string
}

export async function resolveClientBreadcrumbs(
  params: Params
): Promise<Breadcrumb[]> {
  const crumbs: Breadcrumb[] = [
    { label: 'Clients', href: '/organisation/clients' }
  ]

  // Client
  const [client] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.id, params.clientId))

  if (!client) return crumbs

  crumbs.push({
    label: client.name,
    href: `/organisation/clients/${client.id}`
  })

  // Accounting period (optional)
  if (params.periodId) {
    const [period] = await db
      .select({
        id: accountingPeriods.id,
        periodName: accountingPeriods.periodName
      })
      .from(accountingPeriods)
      .where(eq(accountingPeriods.id, params.periodId))

    if (period) {
      crumbs.push({
        label: period.periodName,
        href: `/organisation/clients/accounting-periods/${client.id}`
      })
    }
  }

  return crumbs
}
