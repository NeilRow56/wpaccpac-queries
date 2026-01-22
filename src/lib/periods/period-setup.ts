// src/lib/periods/period-setup.ts

export type PeriodSetupDocV1 = {
  kind: 'PERIOD_SETUP'
  version: 1
  materiality: {
    turnover: { current: number | null; prior: number | null }
    netProfit: { current: number | null; prior: number | null }
  }
  assignments: {
    reviewerId: string | null
    completedById: string | null
  }
  history: Array<{
    role: 'COMPLETED_BY' | 'REVIEWER'
    memberId: string
    from: string // ISO
    to?: string // ISO
  }>
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function toNumOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function toNonEmptyStringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length ? s : null
}

export function periodSetupDefault(): PeriodSetupDocV1 {
  return {
    kind: 'PERIOD_SETUP',
    version: 1,
    materiality: {
      turnover: { current: null, prior: null },
      netProfit: { current: null, prior: null }
    },
    assignments: { reviewerId: null, completedById: null },
    history: []
  }
}

export function normalizePeriodSetup(raw: unknown): PeriodSetupDocV1 | null {
  if (!isRecord(raw)) return null
  if (raw.kind !== 'PERIOD_SETUP' || raw.version !== 1) return null

  const mat = isRecord(raw.materiality) ? raw.materiality : null
  const turnover = isRecord(mat?.turnover) ? mat!.turnover : null
  const netProfit = isRecord(mat?.netProfit) ? mat!.netProfit : null

  const assignments = isRecord(raw.assignments) ? raw.assignments : {}
  const reviewerId = toNonEmptyStringOrNull(assignments.reviewerId)
  const completedById = toNonEmptyStringOrNull(assignments.completedById)

  const historyRaw = Array.isArray(raw.history) ? raw.history : []
  type HistoryItem = PeriodSetupDocV1['history'][number]

  function isHistoryItem(v: HistoryItem | null): v is HistoryItem {
    return v !== null
  }

  const history: HistoryItem[] = historyRaw
    .filter(isRecord)
    .map(h => {
      const role =
        h.role === 'REVIEWER'
          ? 'REVIEWER'
          : h.role === 'COMPLETED_BY'
            ? 'COMPLETED_BY'
            : null

      const memberId = toNonEmptyStringOrNull(h.memberId)
      const from = toNonEmptyStringOrNull(h.from)
      const to = toNonEmptyStringOrNull(h.to) ?? undefined

      if (!role || !memberId || !from) return null

      // 👇 ensure role is the literal union, not string
      const item: HistoryItem = { role, memberId, from, to }
      return item
    })
    .filter(isHistoryItem)

  return {
    kind: 'PERIOD_SETUP',
    version: 1,
    materiality: {
      turnover: {
        current: toNumOrNull(turnover?.current),
        prior: toNumOrNull(turnover?.prior)
      },
      netProfit: {
        current: toNumOrNull(netProfit?.current),
        prior: toNumOrNull(netProfit?.prior)
      }
    },
    assignments: { reviewerId, completedById },
    history
  }
}

export function applyPeriodSetupHistory(
  prev: PeriodSetupDocV1,
  next: PeriodSetupDocV1
): PeriodSetupDocV1 {
  const now = new Date().toISOString()
  const history = [...prev.history]

  const bump = (role: 'COMPLETED_BY' | 'REVIEWER', newId: string | null) => {
    if (!newId) return

    const prevId =
      role === 'COMPLETED_BY'
        ? prev.assignments.completedById
        : prev.assignments.reviewerId

    if (!prevId) {
      history.push({ role, memberId: newId, from: now })
      return
    }

    if (prevId === newId) return

    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i]
      if (h.role === role && h.memberId === prevId && !h.to) {
        history[i] = { ...h, to: now }
        break
      }
    }

    history.push({ role, memberId: newId, from: now })
  }

  bump('COMPLETED_BY', next.assignments.completedById)
  bump('REVIEWER', next.assignments.reviewerId)

  return { ...next, history }
}
