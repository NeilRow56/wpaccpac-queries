import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp
} from 'drizzle-orm/pg-core'
import { clients } from './clients'
import { relations } from 'drizzle-orm'
import { depreciationEntries } from './fixedAssets'

// Accounting Periods
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
    isOpen: boolean('is_open').notNull().default(true),
    isCurrent: boolean('is_current').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow()
  },
  table => ({
    clientDateIdx: index('accounting_period_client_dates_idx').on(
      table.clientId,
      table.startDate,
      table.endDate
    )
  })
)

export type AccountingPeriod = typeof accountingPeriods.$inferSelect

export const accountingPeriodRelations = relations(
  accountingPeriods,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [accountingPeriods.clientId],
      references: [clients.id]
    }),
    depreciationEntries: many(depreciationEntries)
  })
)
