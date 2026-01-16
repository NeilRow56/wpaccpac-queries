// db/schema/relations.ts
import { relations } from 'drizzle-orm'

import { clients } from './clients'
import { accountingPeriods } from './accountingPeriods'
import { accountingPeriodNotes } from './accountingPeriodNotes'

import {
  fixedAssets,
  assetCategories,
  assetPeriodBalances,
  assetMovements
} from './fixedAssets'
import { depreciationEntries } from './depreciationEntries'

// ---- Clients ----
export const clientRelations = relations(clients, ({ many }) => ({
  accountingPeriods: many(accountingPeriods),
  accountingPeriodNotes: many(accountingPeriodNotes),
  fixedAssets: many(fixedAssets),
  assetMovements: many(assetMovements)
}))

// ---- Accounting periods ----
export const accountingPeriodRelations = relations(
  accountingPeriods,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [accountingPeriods.clientId],
      references: [clients.id]
    }),

    depreciationEntries: many(depreciationEntries),

    // ✅ one-to-one notes (or none)
    note: one(accountingPeriodNotes, {
      fields: [accountingPeriods.id],
      references: [accountingPeriodNotes.periodId]
    })
  })
)

// ---- Accounting period notes ----
export const accountingPeriodNotesRelations = relations(
  accountingPeriodNotes,
  ({ one }) => ({
    period: one(accountingPeriods, {
      fields: [accountingPeriodNotes.periodId],
      references: [accountingPeriods.id]
    }),
    client: one(clients, {
      fields: [accountingPeriodNotes.clientId],
      references: [clients.id]
    })
  })
)

// ---- Asset categories ----
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

// ---- Fixed assets ----
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
  depreciationEntries: many(depreciationEntries),
  movements: many(assetMovements)
}))

// ---- Asset period balances ----
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

// ---- Depreciation entries ----
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

// ---- Asset movements ----
export const assetMovementRelations = relations(assetMovements, ({ one }) => ({
  asset: one(fixedAssets, {
    fields: [assetMovements.assetId],
    references: [fixedAssets.id]
  }),
  period: one(accountingPeriods, {
    fields: [assetMovements.periodId],
    references: [accountingPeriods.id]
  }),
  client: one(clients, {
    fields: [assetMovements.clientId],
    references: [clients.id]
  })
}))
