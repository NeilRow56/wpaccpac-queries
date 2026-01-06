'use client'

import { useState } from 'react'
import { AccountingPeriod } from '@/db/schema'

export type PeriodAction =
  | { type: 'close'; period: AccountingPeriod }
  | { type: 'roll'; period: AccountingPeriod }

export function usePeriodActionModal() {
  const [action, setAction] = useState<PeriodAction | null>(null)

  return {
    action,
    openClose: (period: AccountingPeriod) =>
      setAction({ type: 'close', period }),
    openRoll: (period: AccountingPeriod) => setAction({ type: 'roll', period }),
    close: () => setAction(null)
  }
}
