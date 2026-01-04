// lib/schema.ts
import { relations } from 'drizzle-orm'
import {
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { clients } from './clients'
import { accountingPeriods } from './accountingPeriods'

// Depreciation method enum
export const depreciationMethodEnum = pgEnum('depreciation_method', [
  'straight_line',
  'reducing_balance'
])

// Asset Categories
export const assetCategories = pgTable(
  'asset_categories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id),
    description: text('description'),
    defaultDepreciationRate: decimal('default_depreciation_rate', {
      precision: 5,
      scale: 2
    }),
    createdAt: timestamp('created_at').defaultNow()
  },
  table => ({
    categoryClientNameIdx: uniqueIndex('category_client_name_idx').on(
      table.clientId,
      table.name
    )
  })
)

export type AssetCategory = typeof assetCategories.$inferSelect

// Fixed Assets
export const fixedAssets = pgTable('fixed_assets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id),
  categoryId: text('category_id')
    .notNull()
    .references(() => assetCategories.id),
  description: text('description'),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  dateOfPurchase: date('date_of_purchase').notNull(),
  costAdjustment: decimal('cost_adjustment', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  depreciationAdjustment: decimal('depreciation_adjustment', {
    precision: 10,
    scale: 2
  })
    .notNull()
    .default('0'),
  depreciationMethod: depreciationMethodEnum('depreciation_method').notNull(),
  depreciationRate: decimal('depreciation_rate', {
    precision: 5,
    scale: 2
  }).notNull(),
  totalDepreciationToDate: decimal('total_depreciation_to_date', {
    precision: 10,
    scale: 2
  }).default('0'),
  disposalValue: decimal('disposal_value', { precision: 10, scale: 2 }),
  disposalDate: date('disposal_date'),
  createdAt: timestamp('created_at').defaultNow()
})

export type FixedAsset = typeof fixedAssets.$inferSelect

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
      .references(() => accountingPeriods.id),
    openingBalance: decimal('opening_balance', {
      precision: 10,
      scale: 2
    }).notNull(),
    depreciationAmount: decimal('depreciation_amount', {
      precision: 10,
      scale: 2
    }).notNull(),
    closingBalance: decimal('closing_balance', {
      precision: 10,
      scale: 2
    }).notNull(),
    daysInPeriod: integer('days_in_period').notNull(),
    depreciationMethod: depreciationMethodEnum('depreciation_method').notNull(),
    rateUsed: decimal('rate_used', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow()
  },
  table => ({
    depreciationAssetPeriodIdx: uniqueIndex('depreciation_asset_period_idx').on(
      table.assetId,
      table.periodId
    )
  })
)

export type DepreciationEntry = typeof depreciationEntries.$inferSelect

// Relations
export const categoryRelations = relations(
  assetCategories,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [assetCategories.clientId],
      references: [clients.id]
    }),
    assets: many(fixedAssets)
  })
)

export const fixedAssetRelations = relations(fixedAssets, ({ one, many }) => ({
  client: one(clients, {
    fields: [fixedAssets.clientId],
    references: [clients.id]
  }),
  category: one(assetCategories, {
    fields: [fixedAssets.categoryId],
    references: [assetCategories.id]
  }),
  depreciationEntries: many(depreciationEntries)
}))

export const depreciationEntryRelations = relations(
  depreciationEntries,
  ({ one }) => ({
    asset: one(fixedAssets, {
      fields: [depreciationEntries.assetId],
      references: [fixedAssets.id]
    }),
    period: one(accountingPeriods, {
      fields: [depreciationEntries.periodId],
      references: [accountingPeriods.id]
    })
  })
)
