import { clients } from './clients'

// Accounting Periods
import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'

export const periodStatusEnum = pgEnum('period_status', [
  'PLANNED',
  'OPEN',
  'CLOSING',
  'CLOSED'
])

export type PeriodStatus = (typeof periodStatusEnum.enumValues)[number]

export const accountingPeriods = pgTable(
  'accounting_periods',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id),
    periodName: text('period_name').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),

    // ✅ New
    status: periodStatusEnum('status').notNull(),

    isCurrent: boolean('is_current').notNull().default(false),

    createdAt: timestamp('created_at').defaultNow()
  },
  table => [
    index('accounting_period_client_dates_idx').on(
      table.clientId,
      table.startDate,
      table.endDate
    ),
    uniqueIndex('one_open_period_per_client_idx')
      .on(table.clientId)
      .where(sql`${table.status} = 'OPEN'`)
  ]
)

export type AccountingPeriod = typeof accountingPeriods.$inferSelect
