import { AccountingPeriod } from '@/db/schema'

export function canClosePeriod(period: AccountingPeriod) {
  return period.isOpen === true
}

export function canRollForward(period: AccountingPeriod) {
  return period.isOpen === true && period.isCurrent === true
}
