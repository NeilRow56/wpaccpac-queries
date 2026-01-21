export type ScheduleInputLine = {
  kind: 'INPUT'
  id: string
  label: string
  amount: number | null
  notes?: string
}

export type ScheduleTotalLine = {
  kind: 'TOTAL'
  id: string
  label: string
  sumOf: string[] // line ids to sum (typically INPUT ids)
}

export type ScheduleLine = ScheduleInputLine | ScheduleTotalLine

export type SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE'
  version: 1
  sections: Array<{
    id: string
    title: string
    lines: ScheduleLine[]
    notes?: string
  }>
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(x => typeof x === 'string')
}

export function isSimpleScheduleDocV1(v: unknown): v is SimpleScheduleDocV1 {
  if (!isRecord(v)) return false
  if (v.kind !== 'SIMPLE_SCHEDULE') return false
  if (v.version !== 1) return false
  if (!Array.isArray(v.sections)) return false

  for (const s of v.sections) {
    if (!isRecord(s)) return false
    if (typeof s.id !== 'string') return false
    if (typeof s.title !== 'string') return false
    if (!Array.isArray(s.lines)) return false
    if (s.notes !== undefined && typeof s.notes !== 'string') return false

    for (const l of s.lines) {
      if (!isRecord(l)) return false
      if (typeof l.id !== 'string') return false
      if (typeof l.label !== 'string') return false

      const kind = l.kind
      if (kind === 'INPUT') {
        const amt = l.amount
        if (!(amt === null || typeof amt === 'number')) return false
        if (l.notes !== undefined && typeof l.notes !== 'string') return false
      } else if (kind === 'TOTAL') {
        if (!isStringArray(l.sumOf)) return false
      } else {
        return false
      }
    }
  }

  return true
}
