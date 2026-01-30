// lib/schedules/templates/vat-summary.ts
import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const vatSummaryDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [{ id: 'vat-summary', name: 'VAT summary', url: '' }],

  // Attachments-only schedule
  sections: []
}
