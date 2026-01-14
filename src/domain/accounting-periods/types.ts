import { PeriodStatus } from '@/db/schema'

export interface AccountingPeriod {
  id: string
  clientId: string
  periodName: string
  startDate: string
  endDate: string

  status: PeriodStatus // ✅ add this
  isCurrent: boolean
  createdAt: Date | null
}
