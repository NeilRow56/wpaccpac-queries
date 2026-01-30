// lib/schedules/templates/sundry-workings.ts
import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const sundryWorkingsDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [{ id: 'drawings-summary', name: 'Drawings summary', url: '' }],

  // Attachments-only schedule
  sections: []
}
