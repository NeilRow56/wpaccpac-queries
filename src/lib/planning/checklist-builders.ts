import { ChecklistDoc } from './checklist-types'

export function buildChecklistDocFromDefaults(
  rows: { id: string; text: string }[]
): ChecklistDoc {
  return {
    kind: 'CHECKLIST',
    rows: rows.map(r => ({ id: r.id, text: r.text, response: null }))
  }
}

export function resetChecklistResponses(doc: ChecklistDoc): ChecklistDoc {
  return { ...doc, rows: doc.rows.map(r => ({ ...r, response: null })) }
}
