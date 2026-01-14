// app/accounting-periods/page.tsx

import { eq, sql } from 'drizzle-orm'

import { accountingPeriods, clients } from '@/db/schema'
import { db } from '@/db'
import { AccountingPeriodsClient } from './_components/accounting-periods-client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

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
      isOpen: accountingPeriods.isOpen, // keep for now
      status: accountingPeriods.status,
      isCurrent: accountingPeriods.isCurrent,
      createdAt: accountingPeriods.createdAt
    })
    .from(accountingPeriods)
    .where(eq(accountingPeriods.clientId, clientId))
    .orderBy(sql`${accountingPeriods.startDate} DESC`)

  const plannedPeriod = allPeriods.find(p => p.status === 'PLANNED') ?? null

  const [client] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.id, clientId))

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8'>
        <h1 className='text-xl font-bold'>Accounting Periods</h1>

        <Link href={`/organisation/clients/${clientId}/fixed-assets`}>
          <Button variant='ghost' className='mb-4'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            <span className='text-primary'>Back to Assets</span>
          </Button>
        </Link>
        <Link href={`/organisation/clients/${clientId}/accounting-periods/`}>
          <Button variant='ghost' className='mb-4'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            <span className='text-primary'>Back to Assets</span>
          </Button>
        </Link>
      </div>
      <AccountingPeriodsClient
        periods={allPeriods}
        clientId={clientId}
        clientName={client?.name || clientId}
        plannedPeriodId={plannedPeriod?.id ?? null}
      />

      <div className='text-muted-foreground mt-6 flex-col space-x-4 pl-8'>
        <span className='text-red-600'>NB: </span>
        <div className='flex flex-col space-y-2'>
          <span>
            The control of accounting periods is fundamental to protecting the
            accuracy of your client data.
          </span>
          <span>Only one period can be current.</span>
          <span>
            We suggest leaving a period open until you are ready to commence the
            following financial period, or you are absolutely sure there will be
            no further adjustments.
          </span>
          <span>
            The closing of a period is when depreciation values are locked.
          </span>
          <span>Once a period is closed it cannot be reopened or deleted.</span>
          <span>
            When you close a period the next financial period will be created
            automatically. You can edit dates before creation.
          </span>
        </div>

        <p className='pt-4'>
          Any problems please contact:
          <span className='pl-2 text-blue-600'>admin@wpaccpac.org</span>
        </p>
      </div>
    </div>
  )
}
