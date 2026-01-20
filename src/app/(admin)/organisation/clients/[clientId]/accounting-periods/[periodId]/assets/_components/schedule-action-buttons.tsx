'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  recalculateDepreciationForPeriodAction,
  seedAssetPeriodBalancesAction
} from '@/server-actions/fixed-assets-period-schedule'

export default function ScheduleActions(props: {
  clientId: string
  periodId: string
}) {
  const { clientId, periodId } = props
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  return (
    <div className='flex items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await seedAssetPeriodBalancesAction({
              clientId,
              periodId
            })
            if (!res.success) {
              toast.error(res.error ?? 'Failed to generate schedule')
              return
            }
            toast.success('Schedule generated')
            router.refresh()
          })
        }
      >
        {pending ? 'Working…' : 'Generate schedule'}
      </Button>

      <Button
        type='button'
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await recalculateDepreciationForPeriodAction({
              clientId,
              periodId
            })
            if (!res.success) {
              toast.error(res.error ?? 'Failed to recalculate depreciation')
              return
            }
            toast.success('Depreciation recalculated')
            router.refresh()
          })
        }
      >
        {pending ? 'Working…' : 'Recalculate depreciation'}
      </Button>
    </div>
  )
}
