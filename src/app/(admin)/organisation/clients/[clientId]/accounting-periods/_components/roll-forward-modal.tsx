'use client'

import { Button } from '@/components/ui/button'
import { AccountingPeriod } from '@/db/schema'
import { nextPeriodEnd, nextPeriodStart } from '@/lib/periods/period-dates'
import { rollAccountingPeriod } from '@/server-actions/accounting-periods'

import { useTransition } from 'react'

type Props = {
  period: AccountingPeriod
  clientId: string
  onClose: () => void
}

export function RollForwardModal({ period, clientId, onClose }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await rollAccountingPeriod({
        clientId,
        periodName: `Period starting ${nextPeriodStart(period.endDate)}`,
        startDate: nextPeriodStart(period.endDate),
        endDate: nextPeriodEnd(period.endDate)
      })

      onClose()
    })
  }

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/40'>
      <div className='w-[440px] space-y-4 rounded-lg bg-white p-6'>
        <h2 className='text-lg font-semibold'>
          Roll Accounting Period Forward
        </h2>

        <p className='text-sm'>
          This will close <strong>{period.periodName}</strong> and create a new
          accounting period.
        </p>

        <div className='bg-muted rounded p-3 text-sm'>
          <div>
            New period start: <strong>{nextPeriodStart(period.endDate)}</strong>
          </div>
          <div>
            New period end: <strong>{nextPeriodEnd(period.endDate)}</strong>
          </div>
        </div>

        <p className='text-sm text-red-600'>This action cannot be undone.</p>

        <div className='flex justify-end gap-2 pt-4'>
          <Button
            className='rounded border px-4 py-2'
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button
            className='rounded bg-blue-600 px-4 py-2 text-white'
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Rolling…' : 'Roll Forward'}
          </Button>
        </div>
      </div>
    </div>
  )
}
