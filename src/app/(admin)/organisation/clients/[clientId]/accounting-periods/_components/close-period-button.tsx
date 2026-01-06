'use client'

import { Button } from '@/components/ui/button'
import { AccountingPeriod } from '@/db/schema'
import { canClosePeriod } from '@/lib/periods/period-actions'

interface ClosePeriodButtonProps {
  period: AccountingPeriod
  onClick: () => void
  disabled?: boolean
  children?: React.ReactNode
}

export function ClosePeriodButton({
  period,
  onClick,
  disabled,
  children
}: ClosePeriodButtonProps) {
  const isDisabled = disabled ?? !canClosePeriod(period)

  return (
    <Button
      size='sm'
      variant='destructive'
      disabled={isDisabled}
      onClick={onClick}
      title={isDisabled ? 'This period is already closed' : undefined}
    >
      {children ?? 'Close'}
    </Button>
  )
}
