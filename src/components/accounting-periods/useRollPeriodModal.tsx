// components/accounting-periods/useRollPeriodModal.ts
import { useState } from 'react'
import { AccountingPeriod } from '@/db/schema'

export function useRollPeriodModal() {
  const [period, setPeriod] = useState<AccountingPeriod | null>(null)

  return {
    period,
    open: (p: AccountingPeriod) => setPeriod(p),
    close: () => setPeriod(null)
  }
}
