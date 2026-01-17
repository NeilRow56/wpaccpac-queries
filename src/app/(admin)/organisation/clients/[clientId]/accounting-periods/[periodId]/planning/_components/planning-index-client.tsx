'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

// import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PeriodStatus } from '@/db/schema'
import { B_DOCS } from '@/planning/registry'

export function PlanningIndexClient(props: {
  clientId: string
  periodId: string
  status: PeriodStatus
}) {
  const { clientId, periodId, status } = props
  const isOpen = status === 'OPEN'

  // TODO: later filter based on PlanningPackConfig (Option B + partial)
  const docs = [...B_DOCS].sort((a, b) => a.order - b.order)

  return (
    <div className='space-y-2'>
      {!isOpen ? (
        <div className='rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm'>
          This period is <strong>{status}</strong>. Planning is read-only.
        </div>
      ) : null}

      <div className='rounded-md border'>
        <div className='divide-y'>
          {docs.map(doc => {
            const encoded = encodeURIComponent(doc.code)
            const href = `/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/${encoded}`

            return (
              <div
                key={doc.code}
                className='flex items-center justify-between p-3'
              >
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <div className='font-medium'>{doc.code}</div>
                    <div className='truncate'>{doc.title}</div>
                    {/* <Badge variant='secondary' className='ml-2'>
                      {doc.type}
                    </Badge> */}
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  {/* Placeholder completion UI for now */}
                  <Button variant='ghost' size='sm' disabled>
                    <CheckCircle2 className='mr-2 h-4 w-4' />
                    Complete
                  </Button>

                  <Button asChild size='sm' variant='outline'>
                    <Link href={href}>Open</Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
