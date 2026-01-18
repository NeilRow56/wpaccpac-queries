import {
  pgTable,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  jsonb
} from 'drizzle-orm/pg-core'
import { clients } from './clients'
import { accountingPeriods } from './accountingPeriods'

export const planningDocs = pgTable(
  'planning_docs',
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

    code: text('code').notNull(), // e.g. "B14-2(a)"

    content: text('content').notNull().default(''),
    contentJson: jsonb('content_json'),
    isComplete: boolean('is_complete').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date())
  },
  t => ({
    uniqPeriodCode: uniqueIndex('planning_docs_period_code_uniq').on(
      t.periodId,
      t.code
    )
  })
)

export type PlanningDocs = typeof planningDocs.$inferSelect
