import {
  normalizePeriodSetup,
  type PeriodSetupDocV1
} from '@/lib/periods/period-setup'

type Action = { ok: true; doc: PeriodSetupDocV1 } | { ok: false }

export function tryReadPeriodSetup(raw: unknown): Action {
  const normalized = raw ? normalizePeriodSetup(raw) : null
  return normalized ? { ok: true, doc: normalized } : { ok: false }
}

/**
 * New period behaviour:
 * - prior <- last year's current
 * - current <- blank
 * - reset assignments (reviewer/completed) to blank
 * - keep history as-is (history is still valid “who was assigned when”)
 */
export function resetPeriodSetupForNewPeriod(
  doc: PeriodSetupDocV1
): PeriodSetupDocV1 {
  return {
    ...doc,
    materiality: {
      turnover: {
        current: null,
        prior: doc.materiality.turnover.current
      },
      netProfit: {
        current: null,
        prior: doc.materiality.netProfit.current
      }
    },
    assignments: {
      reviewerId: null,
      completedById: null
    }
  }
}
