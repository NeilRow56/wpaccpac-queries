import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { organization } from './authSchema'

export const clientCategories = pgTable('client_categories', {
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

export type ClientCategory = typeof clientCategories.$inferSelect

export const clientCategoryRelations = relations(
  clientCategories,
  ({ one }) => ({
    organization: one(organization, {
      fields: [clientCategories.organizationId],
      references: [organization.id]
    })
  })
)
