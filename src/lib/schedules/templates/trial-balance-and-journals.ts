// lib/schedules/templates/trial-balance-and-journals.ts
import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const trialBalanceAndJournalsDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [
    { id: 'trial-balance', name: 'Trial balance', url: '' },
    { id: 'journals', name: 'Journals', url: '' }
  ],

  // Attachments-only schedule
  sections: []
}
