import { AccountingPeriod } from '@/db/schema'

export function canClosePeriod(period: AccountingPeriod) {
  return period.status === 'OPEN'
}

export function canRollForward(period: AccountingPeriod) {
  return period.status === 'OPEN' && period.isCurrent === true
}
