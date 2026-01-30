import {
  pgTable,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  pgEnum
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

import { clients, accountingPeriods } from '@/db/schema' // adjust import path if your barrel differs

export const accountsQueryStatusEnum = pgEnum('accounts_query_status', [
  'OPEN',
  'ANSWERED',
  'CLEARED'
])

export const accountsQueries = pgTable(
  'accounts_queries',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    organizationId: text('organization_id').notNull(),

    clientId: text('client_id')
      .notNull()
      .references(() => clients.id),

    periodId: text('period_id')
      .notNull()
      .references(() => accountingPeriods.id, { onDelete: 'restrict' }),

    // Human-friendly query number (1,2,3...) per org+client+period
    number: integer('number').notNull(),

    title: text('title'),

    // TipTap / editor JSON
    questionJson: jsonb('question_json').notNull(),

    status: accountsQueryStatusEnum('status').notNull().default('OPEN'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    createdByMemberId: text('created_by_member_id').notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
  },
  t => ({
    uniqNumber: uniqueIndex('accounts_queries_uniq_number').on(
      t.organizationId,
      t.clientId,
      t.periodId,
      t.number
    ),

    idxOrgClientPeriod: index('accounts_queries_idx_org_client_period').on(
      t.organizationId,
      t.clientId,
      t.periodId
    ),

    idxOrgPeriod: index('accounts_queries_idx_org_period').on(
      t.organizationId,
      t.periodId
    )
  })
)

export const accountsQueryResponses = pgTable(
  'accounts_query_responses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    queryId: text('query_id')
      .notNull()
      .references(() => accountsQueries.id, { onDelete: 'cascade' }),

    responseJson: jsonb('response_json').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    createdByMemberId: text('created_by_member_id').notNull()
  },
  t => ({
    idxQueryCreatedAt: index(
      'accounts_query_responses_idx_query_created_at'
    ).on(t.queryId, t.createdAt)
  })
)

export const accountsQueriesRelations = relations(
  accountsQueries,
  ({ many }) => ({
    responses: many(accountsQueryResponses)
  })
)

export const accountsQueryResponsesRelations = relations(
  accountsQueryResponses,
  ({ one }) => ({
    query: one(accountsQueries, {
      fields: [accountsQueryResponses.queryId],
      references: [accountsQueries.id]
    })
  })
)
