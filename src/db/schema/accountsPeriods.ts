import { relations, sql } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { clients } from './clients'

export const accountsPeriods = pgTable('accounts_periods', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id),
  periodNumeric: varchar('period_numeric').notNull(),
  periodEnding: varchar('period_ending').notNull(),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})

export type AccountsPeriods = typeof accountsPeriods.$inferSelect

export const accountsPeriodRelations = relations(
  accountsPeriods,
  ({ one }) => ({
    client: one(clients, {
      fields: [accountsPeriods.clientId],
      references: [clients.id]
    })
    // accountsSections: many(accountsSection)
  })
)
