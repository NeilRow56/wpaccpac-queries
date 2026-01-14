import { periodStatusEnum } from '@/db/schema'

// src/domain/accounting-periods/periodStatus.ts
export type PeriodStatus = (typeof periodStatusEnum.enumValues)[number]

export const ALLOWED_TRANSITIONS: Record<
  PeriodStatus,
  readonly PeriodStatus[]
> = {
  PLANNED: ['OPEN'],
  OPEN: ['CLOSING', 'CLOSED'], // allow direct close (or remove if you want to enforce CLOSING)
  CLOSING: [], // not used right now
  CLOSED: []
} as const

export function canTransition(from: PeriodStatus, to: PeriodStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export class PeriodTransitionError extends Error {
  constructor(
    public readonly from: PeriodStatus,
    public readonly to: PeriodStatus,
    message = `Invalid period status transition: ${from} → ${to}`
  ) {
    super(message)
    this.name = 'PeriodTransitionError'
  }
}

export function assertValidTransition(
  from: PeriodStatus,
  to: PeriodStatus
): void {
  if (from === to) return // allow no-op (idempotent)
  if (!canTransition(from, to)) throw new PeriodTransitionError(from, to)
}
