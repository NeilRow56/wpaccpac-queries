import { notFound } from 'next/navigation'
import { and, eq, sql, desc, asc } from 'drizzle-orm'
import { db } from '@/db'
import {
  assetCategories,
  fixedAssets,
  clients,
  accountingPeriods,
  accountingPeriodNotes
} from '@/db/schema'
import { ClientOverview } from './_components/client-overview'

export default async function ClientPage({
  params
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params

  const client = await db
    .select({
      id: clients.id,
      name: clients.name,
      entity_type: clients.entity_type,
      notes: clients.notes,
      active: clients.active,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .then(r => r[0])

  if (!client) notFound()

  // ---- Period context (OPEN -> latest CLOSED -> nearest PLANNED) ----
  const currentOpen = await db
    .select({
      id: accountingPeriods.id,
      periodName: accountingPeriods.periodName,
      startDate: accountingPeriods.startDate,
      endDate: accountingPeriods.endDate,
      status: accountingPeriods.status,
      isCurrent: accountingPeriods.isCurrent
    })
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.clientId, clientId),
        eq(accountingPeriods.isCurrent, true),
        eq(accountingPeriods.status, 'OPEN')
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  const latestClosed = !currentOpen
    ? await db
        .select({
          id: accountingPeriods.id,
          periodName: accountingPeriods.periodName,
          startDate: accountingPeriods.startDate,
          endDate: accountingPeriods.endDate,
          status: accountingPeriods.status,
          isCurrent: accountingPeriods.isCurrent
        })
        .from(accountingPeriods)
        .where(
          and(
            eq(accountingPeriods.clientId, clientId),
            eq(accountingPeriods.status, 'CLOSED')
          )
        )
        .orderBy(desc(accountingPeriods.endDate))
        .limit(1)
        .then(r => r[0] ?? null)
    : null

  const nearestPlanned =
    !currentOpen && !latestClosed
      ? await db
          .select({
            id: accountingPeriods.id,
            periodName: accountingPeriods.periodName,
            startDate: accountingPeriods.startDate,
            endDate: accountingPeriods.endDate,
            status: accountingPeriods.status,
            isCurrent: accountingPeriods.isCurrent
          })
          .from(accountingPeriods)
          .where(
            and(
              eq(accountingPeriods.clientId, clientId),
              eq(accountingPeriods.status, 'PLANNED')
            )
          )
          .orderBy(asc(accountingPeriods.startDate))
          .limit(1)
          .then(r => r[0] ?? null)
      : null

  const contextPeriod = currentOpen ?? latestClosed ?? nearestPlanned

  // Optional: newest planned for CTA if there's no OPEN
  const plannedPeriodId = !currentOpen
    ? await db
        .select({ id: accountingPeriods.id })
        .from(accountingPeriods)
        .where(
          and(
            eq(accountingPeriods.clientId, clientId),
            eq(accountingPeriods.status, 'PLANNED')
          )
        )
        .orderBy(desc(accountingPeriods.startDate))
        .limit(1)
        .then(r => r[0]?.id ?? null)
    : null

  // Period note for the context period (1:1)
  const contextPeriodNote = contextPeriod
    ? await db
        .select({
          periodId: accountingPeriodNotes.periodId,
          notes: accountingPeriodNotes.notes,
          updatedAt: accountingPeriodNotes.updatedAt
        })
        .from(accountingPeriodNotes)
        .where(
          and(
            eq(accountingPeriodNotes.clientId, clientId),
            eq(accountingPeriodNotes.periodId, contextPeriod.id)
          )
        )
        .limit(1)
        .then(r => r[0] ?? null)
    : null

  // Useful counts + period status breakdown
  const [assetsCount, categoriesCount, periodsAgg] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(fixedAssets)
      .where(eq(fixedAssets.clientId, clientId))
      .then(r => r[0]?.count ?? 0),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(assetCategories)
      .where(eq(assetCategories.clientId, clientId))
      .then(r => r[0]?.count ?? 0),

    db
      .select({
        total: sql<number>`count(*)::int`,
        planned: sql<number>`sum(case when ${accountingPeriods.status} = 'PLANNED' then 1 else 0 end)::int`,
        open: sql<number>`sum(case when ${accountingPeriods.status} = 'OPEN' then 1 else 0 end)::int`,
        closed: sql<number>`sum(case when ${accountingPeriods.status} = 'CLOSED' then 1 else 0 end)::int`
      })
      .from(accountingPeriods)
      .where(eq(accountingPeriods.clientId, clientId))
      .then(r => r[0] ?? { total: 0, planned: 0, open: 0, closed: 0 })
  ])

  const counts = {
    assets: assetsCount,
    categories: categoriesCount,
    periods: periodsAgg.total,
    periodsPlanned: periodsAgg.planned,
    periodsOpen: periodsAgg.open,
    periodsClosed: periodsAgg.closed
  }

  return (
    <ClientOverview
      clientId={clientId}
      client={client}
      counts={counts}
      currentPeriod={contextPeriod} // keep prop name if you want
      currentPeriodNote={contextPeriodNote} // keep prop name if you want
      plannedPeriodId={plannedPeriodId}
    />
  )
}
