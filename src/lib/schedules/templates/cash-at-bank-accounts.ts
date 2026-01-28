import type { LineItemScheduleDocV1 } from '@/lib/schedules/lineItemScheduleTypes'

export const cashAtBankAccountsDefault: LineItemScheduleDocV1 = {
  kind: 'LINE_ITEM_SCHEDULE',
  version: 1,
  title: 'Cash at bank - bank accounts',
  rows: [
    {
      id: 'bank-1',
      name: 'Bank - current account',
      description: '',
      current: null,
      prior: null
    }
  ]
}
