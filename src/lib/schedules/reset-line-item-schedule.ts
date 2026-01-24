import type { LineItemScheduleDocV1 } from '@/lib/schedules/lineItemScheduleTypes'

export function resetLineItemScheduleForNewPeriod(
  doc: LineItemScheduleDocV1
): LineItemScheduleDocV1 {
  return {
    ...doc,
    rows: doc.rows.map(r => ({
      ...r,
      description: '', // ✅ start new period clean
      current: null,
      prior: null
    }))
  }
}
