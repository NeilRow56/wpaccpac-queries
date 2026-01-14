'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ensurePeriodOpenAction } from '@/server-actions/accounting-periods'

type PeriodStatus = 'PLANNED' | 'OPEN' | 'CLOSING' | 'CLOSED'

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

      // Refresh server components (re-fetch status)
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

  return (
    <div className='space-y-4'>
      {/* ✅ Your real planning UI goes here */}
      <div className='text-muted-foreground text-sm'>
        Planning content / materiality inputs etc.
      </div>
    </div>
  )
}
