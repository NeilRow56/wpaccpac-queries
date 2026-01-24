import { LineItemScheduleDocV1 } from '../lineItemScheduleTypes'

export const debtorsPrepaymentsDefault: LineItemScheduleDocV1 = {
  kind: 'LINE_ITEM_SCHEDULE',
  version: 1,
  title: 'Prepayments',
  rows: [
    {
      id: 'rates',
      name: 'Rates',
      description: '',
      current: null,
      prior: null
    }
  ]
}
