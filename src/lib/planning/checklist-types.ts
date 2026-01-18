// lib/planning/checklist.ts

export type ChecklistRow = {
  id: string
  text: string
}

export type ChecklistDoc = {
  kind: 'CHECKLIST'
  rows: Array<{
    id: string
    text: string
    response: 'AGREED' | 'NA' | null
  }>
}

/**
 * Build a new checklist document from registry defaults.
 * Used when:
 * - seeding a new OPEN period
 * - rendering a checklist that has never been saved
 */
export function buildChecklistDocFromDefaults(
  rows: ChecklistRow[]
): ChecklistDoc {
  return {
    kind: 'CHECKLIST',
    rows: rows.map(r => ({
      id: r.id,
      text: r.text,
      response: null
    }))
  }
}

/**
 * Reset checklist responses for roll-forward.
 * Used when copying docs into a new period.
 */
export function resetChecklistResponses(doc: ChecklistDoc): ChecklistDoc {
  return {
    ...doc,
    rows: doc.rows.map(r => ({
      ...r,
      response: null
    }))
  }
}

export function isChecklistDocJson(v: unknown): v is ChecklistDoc {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  return obj.kind === 'CHECKLIST' && Array.isArray(obj.rows)
}
