'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import DocSignoffStrip from './doc-signoff-strip'

type PlanningIndexClientProps = {
  clientId: string
  periodId: string
  docs: {
    code: string
    title: string
    order: number
    enabled: boolean
    isComplete: boolean
    reviewedAt?: Date | null
    reviewedByMemberId?: string | null
    completedAt?: Date | null
    completedByMemberId?: string | null
  }[]
  hint: { count: number; prevPeriodId: string } | null
  defaults: {
    reviewerId: string | null
    completedById: string | null
  }
}

export default function PlanningIndexClient({
  clientId,
  periodId,
  docs,
  hint,
  defaults
}: PlanningIndexClientProps) {
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
              <div
                key={d.code}
                className='hover:bg-muted/50 flex items-center justify-between px-4 py-3 text-sm'
              >
                <Link href={href} className='min-w-0 flex-1'>
                  <div className='truncate font-medium'>
                    {d.code} — {d.title}
                  </div>
                </Link>

                <div className='ml-4 flex flex-none items-center gap-2'>
                  <div className='hidden lg:flex'>
                    <DocSignoffStrip
                      clientId={clientId}
                      periodId={periodId}
                      code={d.code}
                      reviewedAt={d.reviewedAt ?? null}
                      reviewedByMemberId={d.reviewedByMemberId ?? null}
                      defaultReviewerId={defaults.reviewerId}
                      completedAt={d.completedAt ?? null}
                      completedByMemberId={d.completedByMemberId ?? null}
                      defaultCompletedById={defaults.completedById}
                      compact
                    />
                  </div>

                  {d.isComplete ? (
                    <Badge className='bg-green-600'>Complete</Badge>
                  ) : (
                    <Badge variant='secondary'>In progress</Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
