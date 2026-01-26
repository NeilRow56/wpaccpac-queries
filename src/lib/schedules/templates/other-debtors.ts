// src/lib/schedules/templates/trade-debtors.ts
import { LineItemScheduleDocV1 } from '../lineItemScheduleTypes'

export const OTHER_DEBTORS_SCHEDULE_CODE = 'OTHER_DEBTORS'

export const otherDebtorsDefault: LineItemScheduleDocV1 = {
  kind: 'LINE_ITEM_SCHEDULE',
  version: 1,
  title: 'Other Debtors',
  rows: [
    {
      id: 'other-debtors',
      name: 'Other debtors',
      description: '',
      current: null,
      prior: null
    }
  ]
}
