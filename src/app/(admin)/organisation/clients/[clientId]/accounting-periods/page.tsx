// app/accounting-periods/page.tsx

import { sql } from 'drizzle-orm'

import { accountingPeriods, clients } from '@/db/schema'
import { db } from '@/db'
import { AccountingPeriodsClient } from '@/components/accounting-periods/accounting-periods-client'

export default async function AccountingPeriodsPage() {
  // Fetch all periods
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
    .orderBy(sql`${accountingPeriods.startDate} DESC`)

  // Fetch clients
  const allClients = await db
    .select({
      id: clients.id,
      name: clients.name
    })
    .from(clients)

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold'>Accounting Periods</h1>
        <p className='text-muted-foreground mt-2'>
          Manage accounting periods for all clients
        </p>
      </div>
      <AccountingPeriodsClient periods={allPeriods} clients={allClients} />
    </div>
  )
}
