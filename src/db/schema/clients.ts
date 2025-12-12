import { relations, sql } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

import { accountsPeriods } from './accountsPeriods'
import { organization } from './authSchema'

export const clients = pgTable('clients', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'restrict' }),
  cost_centre_name: text('cost_centre_name').notNull(),
  entity_type: varchar('entity_type').notNull(),
  notes: text('notes')
    .$type<string | null>()
    .default(sql`null`),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export type Client = typeof clients.$inferSelect

export const ClientRelations = relations(clients, ({ many }) => ({
  accountinPeriods: many(accountsPeriods)
}))
