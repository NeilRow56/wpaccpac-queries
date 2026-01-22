// src/lib/schedules/reset-simple-schedule.ts
import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

/**
 * Prepare a SIMPLE_SCHEDULE doc for a new period roll-forward:
 * - Clears all INPUT amounts
 * - Clears section notes (if present)
 * - Clears attachment URLs (keeps id + name)
 * - Leaves TOTAL lines intact (they are computed)
 * - Preserves ui styling on lines/sections
 */
export function resetSimpleScheduleForNewPeriod(
  doc: SimpleScheduleDocV1
): SimpleScheduleDocV1 {
  return {
    ...doc,
    attachments: doc.attachments?.map(a => ({ ...a, url: '' })),
    sections: doc.sections.map(s => ({
      ...s,
      notes: s.notes !== undefined ? '' : undefined,
      lines: s.lines.map(l => {
        if (l.kind === 'INPUT') {
          return { ...l, amount: null }
        }
        return l
      })
    }))
  }
}
