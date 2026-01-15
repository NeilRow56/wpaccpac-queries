import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, FolderTree } from 'lucide-react'

import { getClientById } from '@/server-actions/clients'
import { getCurrentAccountingPeriod } from '@/server-actions/accounting-periods'
import { Button } from '@/components/ui/button'
import ClientLayoutInner from './client-layout-inner'

const formatYMD = (d: string | Date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(d))

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

  // OPEN current period (or null)
  const period = await getCurrentAccountingPeriod(clientId)

  return (
    <div className='min-h-[calc(100vh-1rem)]'>
      {/* Workspace header */}
      <div className='bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-10 backdrop-blur'>
        <div className='border-b'>
          <div className='container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='min-w-0'>
              <h1 className='truncate text-2xl font-semibold'>{client.name}</h1>

              {period ? (
                <p className='text-muted-foreground text-sm'>
                  Current period:{' '}
                  <span className='text-foreground'>
                    {formatYMD(period.startDate)} – {formatYMD(period.endDate)}
                  </span>{' '}
                  <span className='text-green-700'>(Open)</span>
                </p>
              ) : (
                <p className='text-muted-foreground text-sm'>
                  <span className='text-red-600'>
                    No open accounting period
                  </span>
                </p>
              )}
            </div>

            {/* Optional quick actions */}
            <div className='flex flex-wrap gap-2'>
              <Button asChild variant='outline' size='sm'>
                <Link
                  href={`/organisation/clients/${clientId}/asset-categories`}
                >
                  <FolderTree className='mr-2 h-4 w-4' />
                  <span className='text-red-600'>Fixed asset categories</span>
                </Link>
              </Button>

              <Button asChild variant='outline' size='sm'>
                <Link
                  href={`/organisation/clients/${clientId}/accounting-periods`}
                >
                  <Calendar className='mr-2 h-4 w-4' />
                  Accounting periods
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar slot wiring + page content */}
      <div className='container mx-auto px-4 py-6'>
        <ClientLayoutInner clientId={clientId}>{children}</ClientLayoutInner>
      </div>
    </div>
  )
}
