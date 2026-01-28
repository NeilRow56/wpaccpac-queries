// src/lib/schedules/templates/trade-creditors.ts
import { LineItemScheduleDocV1 } from '../lineItemScheduleTypes'

export const TRADE_CREDITORS_SCHEDULE_CODE = 'TRADE_CREDITORS'

export const tradeCreditorsDefault: LineItemScheduleDocV1 = {
  kind: 'LINE_ITEM_SCHEDULE',
  version: 1,
  title: 'Trade Creditors',
  rows: [
    {
      id: 'trade-creditors',
      name: 'Trade creditors',
      description: '',
      current: null,
      prior: null
    }
  ]
}
