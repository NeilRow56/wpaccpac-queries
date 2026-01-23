// src/db/schema/planningDocSignoffs.ts
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uniqueIndex
} from 'drizzle-orm/pg-core'
import { clients } from './clients'
import { accountingPeriods } from './accountingPeriods'

export type SignoffEvent =
  | { type: 'REVIEWED_SET'; memberId: string; at: string }
  | { type: 'REVIEWED_CLEARED'; memberId: string | null; at: string }
  | { type: 'COMPLETED_SET'; memberId: string; at: string }
  | { type: 'COMPLETED_CLEARED'; memberId: string | null; at: string }

export const planningDocSignoffs = pgTable(
  'planning_doc_signoffs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    clientId: text('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),

    periodId: text('period_id')
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: 'restrict' }),

    code: text('code').notNull(),

    reviewedByMemberId: text('reviewed_by_member_id'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    completedByMemberId: text('completed_by_member_id'),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Append-only audit history
    history: jsonb('history').$type<SignoffEvent[]>().notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date())
  },
  t => ({
    uniq: uniqueIndex('planning_doc_signoffs_client_period_code_uniq').on(
      t.clientId,
      t.periodId,
      t.code
    )
  })
)
