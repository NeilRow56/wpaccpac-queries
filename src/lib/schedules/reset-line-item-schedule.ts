import type { LineItemScheduleDocV1 } from '@/lib/schedules/lineItemScheduleTypes'

export function resetLineItemScheduleForNewPeriod(
  doc: LineItemScheduleDocV1
): LineItemScheduleDocV1 {
  return {
    ...doc,
    rows: doc.rows.map(r => ({
      ...r,
      description: '',
      current: null
      // do not overwrite prior
    }))
  }
}
