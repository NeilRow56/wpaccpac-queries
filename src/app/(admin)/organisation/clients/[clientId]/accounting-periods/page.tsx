// app/accounting-periods/page.tsx

import { eq, sql } from 'drizzle-orm'

import { accountingPeriods, clients } from '@/db/schema'
import { db } from '@/db'
import { AccountingPeriodsClient } from './_components/accounting-periods-client'

export default async function AccountingPeriodsPage({
  params
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  // Fetch periods for this client only
  const allPeriods = await db
    .select({
      id: accountingPeriods.id,
      clientId: accountingPeriods.clientId,
      periodName: accountingPeriods.periodName,
      startDate: accountingPeriods.startDate,
      endDate: accountingPeriods.endDate,
      isOpen: accountingPeriods.isOpen,
      isCurrent: accountingPeriods.isCurrent,
      createdAt: accountingPeriods.createdAt
    })
    .from(accountingPeriods)
    .where(eq(accountingPeriods.clientId, clientId))
    .orderBy(sql`${accountingPeriods.startDate} DESC`)

  // Fetch the client name
  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name
    })
    .from(clients)
    .where(eq(clients.id, clientId))

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold'>Accounting Periods</h1>
        <p className='text-muted-foreground/60 mt-2 flex flex-col'>
          <span className='text-primary text-xl'>
            {' '}
            {client?.name || clientId}
          </span>
        </p>
      </div>
      <AccountingPeriodsClient
        periods={allPeriods}
        clientId={clientId}
        clientName={client?.name || clientId}
      />
      <div className='text-muted-foreground mt-6 flex-col space-x-4 pl-8'>
        <span className='text-red-600'>NB: </span>
        <p>
          Once a period is closed it cannot be deleted. In case a period was
          closed in error the edit function is still available. Any data
          relating to a deleted period will be removed from the database.
        </p>

        <p className='pt-4'>
          Any problems please contact:
          <span className='pl-2 text-blue-600'>admin@wpaccpac.org</span>
        </p>
      </div>
    </div>
  )
}
