import { LineItemScheduleDocV1 } from '../lineItemScheduleTypes'

export const vatAndOtherTaxesDefault: LineItemScheduleDocV1 = {
  kind: 'LINE_ITEM_SCHEDULE',
  version: 1,
  title: 'VAT and other taxes',
  rows: [
    {
      id: 'vat',
      name: 'VAT outstanding',
      description: '',
      current: null,
      prior: null
    }
  ]
}
