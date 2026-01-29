import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const wagesAndSalariesDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [
    { id: 'payroll-summary', name: 'Payroll summary', url: '' },
    { id: 'paye-nic-control', name: 'PAYE and NIC control', url: '' }
  ],

  // No sections/lines for now — attachments only
  sections: []
}
