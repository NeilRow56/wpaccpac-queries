'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { recalculateDepreciationForPeriodAction } from '@/server-actions/fixed-assets-period-schedule'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

export default function ScheduleActions(props: {
  clientId: string
  periodId: string
}) {
  const { clientId, periodId } = props
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  return (
    <div className='flex items-center gap-2'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
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
                    toast.error(
                      res.error ?? 'Failed to recalculate depreciation'
                    )
                    return
                  }

                  toast.success('Depreciation recalculated')
                  router.refresh()
                })
              }
            >
              {pending ? 'Working…' : 'Recalculate depreciation'}
            </Button>
          </TooltipTrigger>

          <TooltipContent side='bottom' className='max-w-xs'>
            <p className='text-xs leading-relaxed'>
              Calculates depreciation for this period and writes the charge to
              the period balances (and creates/updates the audit entry).
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
