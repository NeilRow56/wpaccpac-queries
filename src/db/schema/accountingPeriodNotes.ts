// db/schema/accountingPeriodNotes.ts

import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { accountingPeriods } from './accountingPeriods'
import { clients } from './clients'

export const accountingPeriodNotes = pgTable('accounting_period_notes', {
  // ✅ periodId is the PK => one row per period, guaranteed
  periodId: text('period_id')
    .primaryKey()
    .references(() => accountingPeriods.id, { onDelete: 'cascade' }),

  // ✅ optional but recommended for scoping + safety
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),

  notes: text('notes').notNull().default(''),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
})
