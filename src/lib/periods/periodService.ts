import { AccountingPeriod } from '@/db/schema'

export type PeriodState = {
  isActive: boolean
  isClosed: boolean
}

export function getPeriodState(period: AccountingPeriod): PeriodState {
  const isActive = period.isOpen && period.isCurrent
  const isClosed = !period.isOpen

  return { isActive, isClosed }
}

export function canClosePeriod(period: AccountingPeriod): boolean {
  return period.isOpen && period.isCurrent
}

export function canRollForward(period: AccountingPeriod) {
  return period.isOpen && period.isCurrent
}

export function canRollPeriod(period: AccountingPeriod): boolean {
  return period.isOpen && period.isCurrent
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function canEditPeriod(_: AccountingPeriod) {
  return false // invariant: periods are immutable
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function canDeletePeriod(_: AccountingPeriod) {
  return false // invariant
}
