import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { organization } from './authSchema'

export const costCentres = pgTable('cost_centres', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull()
})

export type costCentre = typeof costCentres.$inferSelect

export const costCentreRelations = relations(costCentres, ({ one }) => ({
  organization: one(organization, {
    fields: [costCentres.organizationId],
    references: [organization.id]
  })
}))
