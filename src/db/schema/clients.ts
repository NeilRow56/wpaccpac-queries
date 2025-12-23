import { relations, sql } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

import { accountsPeriods } from './accountsPeriods'
import { organization } from './authSchema'
import { costCentres } from './costCentres'
import { fixedAssets } from './fixedAssets'

export const clients = pgTable('clients', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  name: varchar('name').notNull(),

  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'restrict' }),

  costCentreId: text('cost_centre_id')
    .notNull()
    .references(() => costCentres.id, { onDelete: 'restrict' }),

  entity_type: varchar('entity_type').notNull(),

  notes: text('notes')
    .$type<string | null>()
    .default(sql`null`),

  active: boolean('active').notNull().default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export type Client = typeof clients.$inferSelect

export const ClientRelations = relations(clients, ({ many, one }) => ({
  costCentre: one(costCentres, {
    fields: [clients.costCentreId],
    references: [costCentres.id]
  }),
  accountinPeriods: many(accountsPeriods),
  fixedAssets: many(fixedAssets)
}))
