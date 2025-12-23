// lib/schema.ts
import { relations } from 'drizzle-orm'
import {
  date,
  decimal,
  pgTable,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core'
import { clients } from './clients'

export const fixedAssets = pgTable('fixed_assets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id),
  description: text('description'),
  cost: decimal('cost', { precision: 10, scale: 2 }).notNull(),
  dateOfPurchase: date('date_of_purchase').notNull(),
  adjustment: decimal('adjustment', { precision: 10, scale: 2 })
    .notNull()
    .default('0'), // Fixed: was 'cost'
  depreciationRate: decimal('depreciation_rate', {
    precision: 5,
    scale: 2
  }).notNull(), // as percentage
  totalDepreciationToDate: decimal('total_depreciation_to_date', {
    precision: 10,
    scale: 2
  }).default('0'),
  disposalValue: decimal('disposal_value', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow()
})

export type FixedAsset = typeof fixedAssets.$inferSelect

export const fixedAssetRelations = relations(fixedAssets, ({ one }) => ({
  client: one(clients, {
    fields: [fixedAssets.clientId],
    references: [clients.id]
  })
}))
