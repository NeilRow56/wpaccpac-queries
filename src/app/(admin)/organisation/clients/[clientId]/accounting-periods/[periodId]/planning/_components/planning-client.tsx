'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ensurePeriodOpenAction } from '@/server-actions/accounting-periods'
import type { PeriodStatus } from '@/db/schema'

import { B_DOCS } from '@/planning/registry'
import type { PlanningPackConfig } from '@/planning/types'

export function PlanningClient(props: {
  clientId: string
  periodId: string
  status: PeriodStatus
}) {
  const { clientId, periodId, status } = props
  const router = useRouter()
  const [isStarting, setIsStarting] = React.useState(false)

  const handleStart = async () => {
    setIsStarting(true)
    try {
      const result = await ensurePeriodOpenAction({ clientId, periodId })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      if (result.promoted) toast.success('New period started.')
      else toast.message('Period is already open.')

      router.refresh()
    } finally {
      setIsStarting(false)
    }
  }

  if (status === 'PLANNED') {
    return (
      <div className='space-y-4'>
        <div className='rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm'>
          This period is <strong>PLANNED</strong>. No posting is allowed until
          you start it.
        </div>

        <Button onClick={handleStart} disabled={isStarting}>
          {isStarting ? 'Starting…' : 'Start New Period'}
        </Button>

        <div className='text-muted-foreground text-sm'>
          Planning content will become editable after the period is started.
        </div>
      </div>
    )
  }

  if (status !== 'OPEN') {
    return (
      <div className='rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm'>
        This period is locked ({status}). Posting and edits are disabled.
      </div>
    )
  }

  // TODO: load this from DB later (planningPackConfig). Empty config means “defaults”.
  const config: PlanningPackConfig = {}

  const visibleDocs = B_DOCS.filter(d =>
    d.visibleWhen ? d.visibleWhen(config) : true
  ).sort((a, b) => a.order - b.order)

  return (
    <div className='space-y-4'>
      <div className='text-muted-foreground text-sm'>
        Select a planning document for this period:
      </div>

      <div className='grid gap-2'>
        {visibleDocs.map(doc => (
          <Button
            key={doc.code}
            asChild
            variant='outline'
            className='justify-start'
          >
            <Link
              href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/${encodeURIComponent(doc.code)}`}
            >
              <span className='mr-2 font-mono text-xs'>{doc.code}</span>
              <span>{doc.title}</span>
            </Link>
          </Button>
        ))}
      </div>

      <div className='text-muted-foreground text-xs'>
        Completion status and roll-forward will appear once document instances
        are saved for this period.
      </div>
    </div>
  )
}
