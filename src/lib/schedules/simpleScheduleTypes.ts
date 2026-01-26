export type ScheduleLineUi = {
  emphasis?: 'none' | 'soft' | 'strong'
  tone?: 'default' | 'muted' | 'info' | 'warn'
}

export type ScheduleSectionUi = {
  emphasis?: 'none' | 'soft' | 'strong'
  tone?: 'default' | 'muted' | 'primary' | 'info' | 'warn'
}

export type ScheduleInputLine = {
  kind: 'INPUT'
  id: string
  label: string
  amount: number | null
  notes?: string
  ui?: ScheduleLineUi // ✅ add
}

export type ScheduleCalcLine = {
  kind: 'CALC'
  id: string
  label: string
  add: string[]
  subtract?: string[]
  notes?: string
  ui?: ScheduleLineUi
}

export type ScheduleTotalLine = {
  kind: 'TOTAL'
  id: string
  label: string
  sumOf: string[]
  ui?: ScheduleLineUi // ✅ add
}

export type ScheduleLine =
  | ScheduleInputLine
  | ScheduleTotalLine
  | ScheduleCalcLine

export type ScheduleAttachment = {
  id: string
  name: string
  url: string
}

export type SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE'
  version: 1
  sections: Array<{
    id: string
    title: string
    ui?: ScheduleSectionUi // ✅ new
    lines: ScheduleLine[]
    notes?: string
  }>
  attachments?: ScheduleAttachment[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(x => typeof x === 'string')
}

function isScheduleLineUi(v: unknown): v is ScheduleLineUi {
  if (v === undefined) return true
  if (!isRecord(v)) return false

  const emphasis = v.emphasis
  if (
    emphasis !== undefined &&
    emphasis !== 'none' &&
    emphasis !== 'soft' &&
    emphasis !== 'strong'
  )
    return false

  const tone = v.tone
  if (
    tone !== undefined &&
    tone !== 'default' &&
    tone !== 'muted' &&
    tone !== 'info' &&
    tone !== 'warn'
  )
    return false

  return true
}

function isScheduleSectionUi(v: unknown): v is ScheduleSectionUi {
  if (v === undefined) return true
  if (!isRecord(v)) return false

  const emphasis = v.emphasis
  if (
    emphasis !== undefined &&
    emphasis !== 'none' &&
    emphasis !== 'soft' &&
    emphasis !== 'strong'
  )
    return false

  const tone = v.tone
  if (
    tone !== undefined &&
    tone !== 'default' &&
    tone !== 'muted' &&
    tone !== 'primary' &&
    tone !== 'info' &&
    tone !== 'warn'
  )
    return false

  return true
}

export function isSimpleScheduleDocV1(v: unknown): v is SimpleScheduleDocV1 {
  if (!isRecord(v)) return false
  if (v.kind !== 'SIMPLE_SCHEDULE') return false
  if (v.version !== 1) return false
  if (!Array.isArray(v.sections)) return false

  for (const s of v.sections) {
    if (!isRecord(s)) return false
    if (!isScheduleSectionUi(s.ui)) return false
    if (typeof s.id !== 'string') return false
    if (typeof s.title !== 'string') return false
    if (!Array.isArray(s.lines)) return false
    if (s.notes !== undefined && typeof s.notes !== 'string') return false

    for (const l of s.lines) {
      if (!isRecord(l)) return false
      // ✅ ui (optional)
      if (!isScheduleLineUi(l.ui)) return false

      if (typeof l.id !== 'string') return false
      if (typeof l.label !== 'string') return false

      const kind = l.kind
      if (kind === 'INPUT') {
        const amt = l.amount
        if (!(amt === null || typeof amt === 'number')) return false
        if (l.notes !== undefined && typeof l.notes !== 'string') return false
      } else if (kind === 'TOTAL') {
        if (!isStringArray(l.sumOf)) return false
      } else if (kind === 'CALC') {
        if (!isStringArray(l.add)) return false
        if (l.subtract !== undefined && !isStringArray(l.subtract)) return false
        if (l.notes !== undefined && typeof l.notes !== 'string') return false
      } else {
        return false
      }
    }
  }

  // ✅ attachments (optional)
  if (v.attachments !== undefined) {
    if (!Array.isArray(v.attachments)) return false

    for (const a of v.attachments) {
      if (!isRecord(a)) return false
      if (typeof a.id !== 'string') return false
      if (typeof a.name !== 'string') return false
      if (typeof a.url !== 'string') return false
    }
  }

  return true
}
