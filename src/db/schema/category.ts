import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './authSchema'
import { relations } from 'drizzle-orm'

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull()
})

export type Category = typeof categories.$inferSelect

export const categoryRelations = relations(categories, ({ one }) => ({
  user: one(user, {
    fields: [categories.userId],
    references: [user.id]
  })
}))
