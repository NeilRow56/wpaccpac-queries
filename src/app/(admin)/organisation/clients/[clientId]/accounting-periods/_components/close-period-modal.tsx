'use client'

import { AccountingPeriod } from '@/db/schema'
import { closeAccountingPeriodAction } from '@/server-actions/accounting-periods'

import { useTransition } from 'react'

type Props = {
  period: AccountingPeriod
  clientId: string
  onClose: () => void
}

export function ClosePeriodModal({ period, clientId, onClose }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await closeAccountingPeriodAction({
        clientId,
        periodId: period.id
      })
      onClose()
    })
  }

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/40'>
      <div className='w-[420px] space-y-4 rounded-lg bg-white p-6'>
        <h2 className='text-lg font-semibold'>Close Accounting Period</h2>

        <p className='text-muted text-sm'>
          This will permanently close the accounting period
          <strong> {period.periodName}</strong>.
        </p>

        <p className='text-sm text-red-600'>
          You will not be able to post depreciation or make changes.
        </p>

        <div className='flex justify-end gap-2 pt-4'>
          <button
            className='rounded border px-4 py-2'
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>

          <button
            className='rounded bg-red-600 px-4 py-2 text-white'
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? 'Closing…' : 'Close Period'}
          </button>
        </div>
      </div>
    </div>
  )
}
