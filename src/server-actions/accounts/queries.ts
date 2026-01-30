'use server'

import { revalidatePath } from 'next/cache'

import { and, desc, eq, sql, inArray } from 'drizzle-orm'

import { db } from '@/db'
import {
  accountsQueries,
  accountsQueryResponses,
  accountsQueryStatusEnum
} from '@/db/schema/accounts-queries'

import { member as memberTable, user as userTable } from '@/db/schema'
import { getSessionContext } from '../_helpers/get-session-context'

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string }

type AccountsQueryStatus = (typeof accountsQueryStatusEnum.enumValues)[number]

type MemberDisplay = {
  memberId: string
  userId: string
  name: string | null
  email: string | null
}

function toISODateMaybe(v: unknown): string | null {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

/**
 * TipTap often stores “empty” as doc->paragraph with no text.
 * We avoid creating a response row when the doc is effectively empty.
 */
function isNonEmptyEditorDoc(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false

  const d = doc as { type?: unknown; content?: unknown }
  if (!Array.isArray(d.content)) return true // unknown shape => treat as non-empty

  // Empty array => empty
  if (d.content.length === 0) return false

  // Consider doc with only one empty paragraph as empty
  if (d.content.length === 1) {
    const n0 = d.content[0] as
      | { type?: unknown; content?: unknown; text?: unknown }
      | undefined
    if (!n0 || typeof n0 !== 'object') return true

    const t = n0.type
    if (t === 'paragraph') {
      const inner = (n0 as { content?: unknown }).content
      // paragraph with no content
      if (!Array.isArray(inner) || inner.length === 0) return false

      // paragraph with only empty text nodes
      const hasRealText = inner.some(node => {
        if (!node || typeof node !== 'object') return false
        const txt = (node as { text?: unknown }).text
        return typeof txt === 'string' && txt.trim().length > 0
      })
      return hasRealText
    }
  }

  // Otherwise consider non-empty
  return true
}

async function getMemberDisplayMap(
  memberIds: Array<string | null | undefined>
) {
  const unique = Array.from(
    new Set(
      memberIds.filter(
        (x): x is string => typeof x === 'string' && x.length > 0
      )
    )
  )
  if (unique.length === 0) return new Map<string, MemberDisplay>()

  const rows = await db
    .select({
      memberId: memberTable.id,
      userId: memberTable.userId,
      name: userTable.name,
      email: userTable.email
    })
    .from(memberTable)
    .innerJoin(userTable, eq(memberTable.userId, userTable.id))
    .where(inArray(memberTable.id, unique))

  const map = new Map<string, MemberDisplay>()
  for (const r of rows) map.set(r.memberId, r)
  return map
}

/**
 * Detect unique constraint conflicts safely enough for retry purposes.
 * (Exact shape differs per driver; we do a conservative check.)
 */
function isUniqueViolation(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  const msg = e.message.toLowerCase()
  return msg.includes('unique') || msg.includes('accounts_queries_uniq_number')
}

/**
 * 1) LIST queries (with latest response metadata + member display)
 */
export async function listAccountsQueriesAction(input: {
  clientId: string
  periodId: string
}): Promise<
  ActionResult<
    Array<{
      id: string
      number: number
      title: string | null
      status: AccountsQueryStatus
      createdAt: string
      createdByMemberId: string
      createdByName: string | null
      createdByEmail: string | null
      lastResponseAt: string | null
      lastRespondedByMemberId: string | null
      lastRespondedByName: string | null
      lastRespondedByEmail: string | null
    }>
  >
> {
  try {
    const { organizationId } = await getSessionContext()
    const { clientId, periodId } = input

    const latest = db
      .select({
        queryId: accountsQueryResponses.queryId,
        maxCreatedAt: sql`max(${accountsQueryResponses.createdAt})`.as(
          'maxCreatedAt'
        )
      })
      .from(accountsQueryResponses)
      .groupBy(accountsQueryResponses.queryId)
      .as('latest')

    const rows = await db
      .select({
        id: accountsQueries.id,
        number: accountsQueries.number,
        title: accountsQueries.title,
        status: accountsQueries.status,
        createdAt: accountsQueries.createdAt,
        createdByMemberId: accountsQueries.createdByMemberId,

        lastResponseAt: latest.maxCreatedAt,
        lastRespondedByMemberId: accountsQueryResponses.createdByMemberId
      })
      .from(accountsQueries)
      .where(
        and(
          eq(accountsQueries.organizationId, organizationId),
          eq(accountsQueries.clientId, clientId),
          eq(accountsQueries.periodId, periodId)
        )
      )
      .leftJoin(latest, eq(latest.queryId, accountsQueries.id))
      .leftJoin(
        accountsQueryResponses,
        and(
          eq(accountsQueryResponses.queryId, accountsQueries.id),
          sql`${accountsQueryResponses.createdAt} = ${latest.maxCreatedAt}`
        )
      )
      .orderBy(desc(accountsQueries.number))

    const memberMap = await getMemberDisplayMap(
      rows.flatMap(r => [r.createdByMemberId, r.lastRespondedByMemberId])
    )

    return {
      success: true,
      data: rows.map(r => {
        const createdBy = memberMap.get(r.createdByMemberId)
        const lastBy = r.lastRespondedByMemberId
          ? memberMap.get(r.lastRespondedByMemberId)
          : undefined

        return {
          id: r.id,
          number: r.number,
          title: r.title ?? null,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          createdByMemberId: r.createdByMemberId,
          createdByName: createdBy?.name ?? null,
          createdByEmail: createdBy?.email ?? null,
          lastResponseAt: toISODateMaybe(r.lastResponseAt),
          lastRespondedByMemberId: r.lastRespondedByMemberId ?? null,
          lastRespondedByName: lastBy?.name ?? null,
          lastRespondedByEmail: lastBy?.email ?? null
        }
      })
    }
  } catch (e) {
    return {
      success: false,
      message:
        e instanceof Error ? e.message : 'Failed to list accounts queries'
    }
  }
}

/**
 * 2) GET a single query (+ response history + member display)
 */
export async function getAccountsQueryAction(input: {
  queryId: string
}): Promise<
  ActionResult<{
    query: {
      id: string
      clientId: string
      periodId: string
      number: number
      title: string | null
      status: AccountsQueryStatus
      questionJson: unknown
      createdAt: string
      createdByMemberId: string
      createdByName: string | null
      createdByEmail: string | null
    }
    responses: Array<{
      id: string
      responseJson: unknown
      createdAt: string
      createdByMemberId: string
      createdByName: string | null
      createdByEmail: string | null
    }>
  }>
> {
  try {
    const { organizationId } = await getSessionContext()

    const q = await db
      .select({
        id: accountsQueries.id,
        organizationId: accountsQueries.organizationId,
        clientId: accountsQueries.clientId,
        periodId: accountsQueries.periodId,
        number: accountsQueries.number,
        title: accountsQueries.title,
        status: accountsQueries.status,
        questionJson: accountsQueries.questionJson,
        createdAt: accountsQueries.createdAt,
        createdByMemberId: accountsQueries.createdByMemberId
      })
      .from(accountsQueries)
      .where(eq(accountsQueries.id, input.queryId))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!q) return { success: false, message: 'Query not found' }
    if (q.organizationId !== organizationId)
      return { success: false, message: 'Unauthorised' }

    const responses = await db
      .select({
        id: accountsQueryResponses.id,
        responseJson: accountsQueryResponses.responseJson,
        createdAt: accountsQueryResponses.createdAt,
        createdByMemberId: accountsQueryResponses.createdByMemberId
      })
      .from(accountsQueryResponses)
      .where(eq(accountsQueryResponses.queryId, q.id))
      .orderBy(desc(accountsQueryResponses.createdAt))

    const memberMap = await getMemberDisplayMap([
      q.createdByMemberId,
      ...responses.map(r => r.createdByMemberId)
    ])

    const createdBy = memberMap.get(q.createdByMemberId)

    return {
      success: true,
      data: {
        query: {
          id: q.id,
          clientId: q.clientId,
          periodId: q.periodId,
          number: q.number,
          title: q.title ?? null,
          status: q.status,
          questionJson: q.questionJson,
          createdAt: q.createdAt.toISOString(),
          createdByMemberId: q.createdByMemberId,
          createdByName: createdBy?.name ?? null,
          createdByEmail: createdBy?.email ?? null
        },
        responses: responses.map(r => {
          const responder = memberMap.get(r.createdByMemberId)
          return {
            id: r.id,
            responseJson: r.responseJson,
            createdAt: r.createdAt.toISOString(),
            createdByMemberId: r.createdByMemberId,
            createdByName: responder?.name ?? null,
            createdByEmail: responder?.email ?? null
          }
        })
      }
    }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to load query'
    }
  }
}

/**
 * 3) CREATE a new query (auto-increment number, retry on unique conflict)
 */
export async function createAccountsQueryAction(input: {
  clientId: string
  periodId: string
  revalidatePath?: string
}): Promise<
  ActionResult<{
    id: string
    number: number
  }>
> {
  try {
    const { organizationId, memberId } = await getSessionContext()
    const { clientId, periodId } = input

    const emptyDoc = { type: 'doc', content: [] }

    const inserted = await db.transaction(async tx => {
      // attempt 1
      for (let attempt = 0; attempt < 2; attempt++) {
        const last = await tx
          .select({ number: accountsQueries.number })
          .from(accountsQueries)
          .where(
            and(
              eq(accountsQueries.organizationId, organizationId),
              eq(accountsQueries.clientId, clientId),
              eq(accountsQueries.periodId, periodId)
            )
          )
          .orderBy(desc(accountsQueries.number))
          .limit(1)
          .then(r => r[0]?.number ?? 0)

        const nextNumber = last + 1

        try {
          const row = await tx
            .insert(accountsQueries)
            .values({
              organizationId,
              clientId,
              periodId,
              number: nextNumber,
              title: null,
              questionJson: emptyDoc,
              status: 'OPEN',
              createdByMemberId: memberId
            })
            .returning({
              id: accountsQueries.id,
              number: accountsQueries.number
            })
            .then(r => r[0])

          return row
        } catch (e) {
          if (attempt === 0 && isUniqueViolation(e)) {
            // Someone else inserted the same number; retry once
            continue
          }
          throw e
        }
      }

      throw new Error('Failed to create query')
    })

    if (input.revalidatePath) revalidatePath(input.revalidatePath)

    return { success: true, data: { id: inserted.id, number: inserted.number } }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to create query'
    }
  }
}

/**
 * 4) SAVE query (update question/title/status) + optionally append a response
 */
export async function saveAccountsQueryAction(input: {
  queryId: string
  title: string | null
  status: AccountsQueryStatus
  questionJson: unknown
  responseJson?: unknown
  revalidatePath?: string
}): Promise<ActionResult<null>> {
  try {
    const { organizationId, memberId } = await getSessionContext()

    const existing = await db
      .select({
        id: accountsQueries.id,
        organizationId: accountsQueries.organizationId
      })
      .from(accountsQueries)
      .where(eq(accountsQueries.id, input.queryId))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!existing) return { success: false, message: 'Query not found' }
    if (existing.organizationId !== organizationId)
      return { success: false, message: 'Unauthorised' }

    const shouldInsertResponse =
      input.responseJson && isNonEmptyEditorDoc(input.responseJson)

    await db.transaction(async tx => {
      await tx
        .update(accountsQueries)
        .set({
          title: input.title,
          status: input.status,
          questionJson: input.questionJson,
          updatedAt: new Date()
        })
        .where(eq(accountsQueries.id, input.queryId))

      if (shouldInsertResponse) {
        await tx.insert(accountsQueryResponses).values({
          queryId: input.queryId,
          responseJson: input.responseJson as unknown,
          createdByMemberId: memberId
        })

        if (input.status === 'OPEN') {
          await tx
            .update(accountsQueries)
            .set({ status: 'ANSWERED', updatedAt: new Date() })
            .where(eq(accountsQueries.id, input.queryId))
        }
      }
    })

    if (input.revalidatePath) revalidatePath(input.revalidatePath)

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to save query'
    }
  }
}

/**
 * 5) SET STATUS only
 */
export async function setAccountsQueryStatusAction(input: {
  queryId: string
  status: AccountsQueryStatus
  revalidatePath?: string
}): Promise<ActionResult<null>> {
  try {
    const { organizationId } = await getSessionContext()

    const q = await db
      .select({
        id: accountsQueries.id,
        organizationId: accountsQueries.organizationId
      })
      .from(accountsQueries)
      .where(eq(accountsQueries.id, input.queryId))
      .limit(1)
      .then(r => r[0] ?? null)

    if (!q) return { success: false, message: 'Query not found' }
    if (q.organizationId !== organizationId)
      return { success: false, message: 'Unauthorised' }

    await db
      .update(accountsQueries)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(accountsQueries.id, input.queryId))

    if (input.revalidatePath) revalidatePath(input.revalidatePath)

    return { success: true, data: null }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to set status'
    }
  }
}
