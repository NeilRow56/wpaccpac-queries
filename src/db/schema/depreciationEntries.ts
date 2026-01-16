import {
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'

import { accountingPeriods } from './accountingPeriods'
import { fixedAssets } from './fixedAssets'

// Depreciation Entries (audit trail)
export const depreciationEntries = pgTable(
  'depreciation_entries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    assetId: text('asset_id')
      .notNull()
      .references(() => fixedAssets.id, { onDelete: 'cascade' }),

    periodId: text('period_id')
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: 'cascade' }),

    depreciationAmount: decimal('depreciation_amount', {
      precision: 12,
      scale: 2
    }).notNull(),

    daysInPeriod: integer('days_in_period').notNull(),
    rateUsed: decimal('rate_used', { precision: 5, scale: 2 }).notNull(),

    createdAt: timestamp('created_at').defaultNow()
  },
  table => [
    uniqueIndex('depreciation_asset_period_idx').on(
      table.assetId,
      table.periodId
    )
  ]
)

export type DepreciationEntry = typeof depreciationEntries.$inferSelect
