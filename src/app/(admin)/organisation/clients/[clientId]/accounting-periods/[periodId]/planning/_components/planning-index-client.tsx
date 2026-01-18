'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function PlanningIndexClient(props: {
  clientId: string
  periodId: string
  docs: Array<{
    code: string
    title: string
    order: number
    enabled: boolean
    isComplete: boolean
  }>
  hint: null | { count: number; prevPeriodId: string }
}) {
  const { clientId, periodId, docs, hint } = props

  return (
    <div className='space-y-3'>
      {hint ? (
        <div className='bg-muted/40 rounded-md border p-3 text-sm'>
          <span className='font-medium'>
            {hint.count} document{hint.count === 1 ? '' : 's'} available from
            the previous period.
          </span>
          <div className='text-muted-foreground mt-1 text-xs'>
            These were carried forward to save re-keying. Review and update for
            this period.
          </div>
        </div>
      ) : null}

      <div className='rounded-md border'>
        <div className='divide-y'>
          {docs.map(d => {
            const encoded = encodeURIComponent(d.code)
            const href = `/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/${encoded}`

            return (
              <Link
                key={d.code}
                href={href}
                className={cn(
                  'hover:bg-muted/50 flex items-center justify-between px-4 py-3 text-sm'
                )}
              >
                <div className='min-w-0'>
                  <div className='truncate font-medium'>
                    {d.code} — {d.title}
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  {d.isComplete ? (
                    <Badge className='bg-green-600'>Complete</Badge>
                  ) : (
                    <Badge variant='secondary'>In progress</Badge>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
