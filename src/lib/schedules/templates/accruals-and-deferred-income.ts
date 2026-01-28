import { LineItemScheduleDocV1 } from '../lineItemScheduleTypes'

export const accrualsAndDeferredIncomeDefault: LineItemScheduleDocV1 = {
  kind: 'LINE_ITEM_SCHEDULE',
  version: 1,
  title: 'Accruals and deferred income ',
  rows: [
    {
      id: 'accruals',
      name: '',
      description: '',
      current: null,
      prior: null
    }
  ]
}
