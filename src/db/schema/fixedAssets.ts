// lib/schema.ts
import { relations } from 'drizzle-orm'
import {
  date,
  decimal,
  index,
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
// Asset movement enum
export const assetMovementsEnum = pgEnum('asset_movements_type', [
  'cost_adj',
  'depreciation_adj',
  'revaluation',
  'disposal_full',
  'disposal_partial'
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
  table => [
    uniqueIndex('category_client_name_idx').on(table.clientId, table.name)
  ]
)

export type AssetCategory = typeof assetCategories.$inferSelect

// Fixed Assets
export const fixedAssets = pgTable('fixed_assets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  clientId: text('client_id')
    .notNull()
    .references(() => clients.id),

  categoryId: text('category_id')
    .notNull()
    .references(() => assetCategories.id),

  assetCode: text('asset_code'), // optional but useful
  name: text('name').notNull(),
  description: text('description'),

  acquisitionDate: date('acquisition_date').notNull(),
  originalCost: decimal('original_cost', { precision: 12, scale: 2 }).notNull(),
  costAdjustment: decimal('cost_adjustment', { precision: 12, scale: 2 }),
  depreciationMethod: depreciationMethodEnum('depreciation_method').notNull(),
  depreciationRate: decimal('depreciation_rate', {
    precision: 5,
    scale: 2
  }).notNull(),
  totalDepreciationToDate: decimal('total_depreciation_to_date', {
    precision: 10,
    scale: 2
  }).default('0'),
  usefulLifeYears: integer('useful_life_years'),

  createdAt: timestamp('created_at').defaultNow()
})

export type FixedAsset = typeof fixedAssets.$inferSelect

export const assetPeriodBalances = pgTable(
  'asset_period_balances',
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

    costBfwd: decimal('cost_bfwd', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    additions: decimal('additions', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    disposalsCost: decimal('disposals_cost', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    costAdjustment: decimal('cost_adjustment', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),

    depreciationBfwd: decimal('depreciation_bfwd', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    depreciationCharge: decimal('depreciation_charge', {
      precision: 12,
      scale: 2
    })
      .notNull()
      .default('0'),
    depreciationOnDisposals: decimal('depreciation_on_disposals', {
      precision: 12,
      scale: 2
    })
      .notNull()
      .default('0'),
    depreciationAdjustment: decimal('depreciation_adjustment', {
      precision: 12,
      scale: 2
    })
      .notNull()
      .default('0'),
    disposalProceeds: decimal('disposal_proceeds', {
      precision: 12,
      scale: 2
    })
      .notNull()
      .default('0'),

    createdAt: timestamp('created_at').defaultNow()
  },
  table => [
    uniqueIndex('asset_period_unique_idx').on(table.assetId, table.periodId)
  ]
)

export type AssetPeriodBalances = typeof assetPeriodBalances.$inferSelect

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

export const assetMovements = pgTable(
  'asset_movements',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientId: text('client_id')
      .notNull()
      .references(() => clients.id),

    assetId: text('asset_id')
      .notNull()
      .references(() => fixedAssets.id, { onDelete: 'cascade' }),

    periodId: text('period_id')
      .notNull()
      .references(() => accountingPeriods.id),
    movementType: assetMovementsEnum('asset_movement_type').notNull(),
    postingDate: date('posting_date').notNull(),
    amountCost: decimal('amount_cost', { precision: 12, scale: 2 }).notNull(),
    amountDepreciation: decimal('amount_depreciation', {
      precision: 12,
      scale: 2
    }),
    amountProceeds: decimal('amount_proceeds', { precision: 12, scale: 2 }),
    disposalPercentage: decimal('disposal_percentage', {
      precision: 12,
      scale: 2
    }),
    note: text('note'),

    createdAt: timestamp('created_at').defaultNow()
  },
  table => [
    index('asset_movement_asset_period_idx').on(table.assetId, table.periodId),
    index('asset_movement_asset_date_idx').on(table.assetId, table.postingDate)
  ]
)

export type AssetMovements = typeof assetMovements.$inferSelect

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
  periodBalances: many(assetPeriodBalances),
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

export const assetPeriodBalanceRelations = relations(
  assetPeriodBalances,
  ({ one }) => ({
    asset: one(fixedAssets, {
      fields: [assetPeriodBalances.assetId],
      references: [fixedAssets.id]
    }),
    period: one(accountingPeriods, {
      fields: [assetPeriodBalances.periodId],
      references: [accountingPeriods.id]
    })
  })
)
