export const PERIOD_STATUS = ['PLANNED', 'OPEN', 'CLOSING', 'CLOSED'] as const
export type PeriodStatus = (typeof PERIOD_STATUS)[number]

export function toPeriodStatus(v: unknown): PeriodStatus {
  return (PERIOD_STATUS as readonly string[]).includes(String(v))
    ? (v as PeriodStatus)
    : 'CLOSED'
}
