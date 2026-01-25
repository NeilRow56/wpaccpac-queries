// src/lib/schedules/templates/trade-debtors.ts
import { LineItemScheduleDocV1 } from '../lineItemScheduleTypes'

export const TRADE_DEBTORS_SCHEDULE_CODE = 'TRADE_DEBTORS'

export const tradeDebtorsDefault: LineItemScheduleDocV1 = {
  kind: 'LINE_ITEM_SCHEDULE',
  version: 1,
  title: 'Trade Debtors',
  rows: [
    {
      id: 'trade-debtors',
      name: 'Trade debtors',
      description: '',
      current: null,
      prior: null
    }
  ]
}
