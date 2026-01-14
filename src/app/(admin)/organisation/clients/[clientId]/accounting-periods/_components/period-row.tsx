'use client'

import { useState } from 'react'
import { AccountingPeriod } from '@/db/schema'
import { ClosePeriodButton } from './close-period-button'

import { usePeriodActionModal } from '@/components/accounting-periods/use-period-action-modal'
import { PeriodActionModal } from '@/components/accounting-periods/period-action-modal'
import { Loader2 } from 'lucide-react'
import { RollForwardButton } from './roll-forward-button'

export function PeriodRow({
  period,
  clientId
}: {
  period: AccountingPeriod
  clientId: string
}) {
  const modal = usePeriodActionModal()
  const [loadingAction, setLoadingAction] = useState<'close' | 'roll' | null>(
    null
  )
  const periodStatus = period.status
  const isClosing = loadingAction === 'close'
  const isRolling = loadingAction === 'roll'

  return (
    <>
      <div className='flex items-center justify-between rounded border p-3'>
        <div>
          <div className='font-medium'>{period.periodName}</div>
          <div className='text-muted-foreground text-sm'>
            {period.startDate} → {period.endDate}
          </div>
        </div>

        <div className='flex gap-2'>
          <ClosePeriodButton
            period={period}
            disabled={isClosing || isRolling}
            onClick={() => {
              if (periodStatus !== 'OPEN') return
              setLoadingAction('close')
              modal.openClose(period)
            }}
          >
            {isClosing ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Close'}
          </ClosePeriodButton>

          <RollForwardButton
            period={period}
            disabled={isClosing || isRolling}
            onClick={() => {
              if (periodStatus !== 'OPEN' || !period.isCurrent) return
              setLoadingAction('roll')
              modal.openRoll(period)
            }}
          >
            {isRolling ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Roll Forward'
            )}
          </RollForwardButton>
        </div>
      </div>

      {modal.action && (
        <PeriodActionModal
          action={modal.action}
          clientId={clientId}
          onClose={() => {
            setLoadingAction(null)
            modal.close()
          }}
        />
      )}
    </>
  )
}
