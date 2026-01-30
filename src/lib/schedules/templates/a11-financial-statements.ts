// lib/schedules/templates/a11-financial-statements.ts
import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const financialStatementsDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  // Primary attachment for the PDF copy of the accounts
  attachments: [
    {
      id: 'financial-statements-pdf',
      name: 'Financial statements (PDF)',
      url: ''
    }
  ],

  // Attachments-only schedule
  sections: []
}
