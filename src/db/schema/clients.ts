import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar
} from 'drizzle-orm/pg-core'
import { user } from './authSchema'
import { accountsPeriods } from './accountsPeriods'

export const businessTypes = [
  'Unknown',
  'Sole Trader',
  'Partnership',
  'Limited company - tiny',
  'Limited company - small',
  'Limited company - full'
] as const

export type BusinessType = (typeof businessTypes)[number]
export const businessTypeEnum = pgEnum('business_type_enum', businessTypes)

export const clients = pgTable('clients', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar('name').notNull(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),
  cost_centre_name: text('cost_centre_id').notNull(),
  entity_type: businessTypeEnum(),
  notes: text('notes'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

export type Client = typeof clients.$inferSelect

export const ClientRelations = relations(clients, ({ many }) => ({
  accountinPeriods: many(accountsPeriods)
}))
