'use client'

import { Button } from '@/components/ui/button'
import { AccountingPeriod } from '@/db/schema'
import { canRollForward } from '@/lib/periods/period-actions'

interface RollForwardButtonProps {
  period: AccountingPeriod
  onClick: () => void
  disabled?: boolean
  children?: React.ReactNode
}

export function RollForwardButton({
  period,
  onClick,
  disabled,
  children
}: RollForwardButtonProps) {
  const isDisabled = disabled ?? !canRollForward(period)

  return (
    <Button
      size='sm'
      variant='default'
      disabled={isDisabled}
      onClick={onClick}
      title={
        isDisabled
          ? !period.isOpen
            ? 'Cannot roll a closed period'
            : !period.isCurrent
              ? 'Only current period can be rolled forward'
              : undefined
          : undefined
      }
    >
      {children ?? 'Roll Forward'}
    </Button>
  )
}
