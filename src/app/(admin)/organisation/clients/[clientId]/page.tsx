import { notFound } from 'next/navigation'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  assetCategories,
  fixedAssets,
  clients,
  accountingPeriods,
  accountingPeriodNotes
} from '@/db/schema'
import { ClientOverview } from './_components/client-overvies'

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

  // Current OPEN period (and current flag)
  const currentPeriod = await db
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

  // Planned period id (handy CTA if no current OPEN)
  const plannedPeriodId = await db
    .select({ id: accountingPeriods.id })
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.clientId, clientId),
        eq(accountingPeriods.status, 'PLANNED')
      )
    )
    .orderBy(sql`${accountingPeriods.startDate} DESC`)
    .limit(1)
    .then(r => r[0]?.id ?? null)

  // Period note for current period (1:1)
  const currentPeriodNote = currentPeriod
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
            eq(accountingPeriodNotes.periodId, currentPeriod.id)
          )
        )
        .limit(1)
        .then(r => r[0] ?? null)
    : null

  // Useful counts
  const [assetsCount, categoriesCount, periodsCount] = await Promise.all([
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
      .select({ count: sql<number>`count(*)::int` })
      .from(accountingPeriods)
      .where(eq(accountingPeriods.clientId, clientId))
      .then(r => r[0]?.count ?? 0)
  ])

  const counts = {
    assets: assetsCount,
    categories: categoriesCount,
    periods: periodsCount
  }

  return (
    <ClientOverview
      clientId={clientId}
      client={client}
      counts={counts}
      currentPeriod={currentPeriod}
      currentPeriodNote={currentPeriodNote}
      plannedPeriodId={plannedPeriodId}
    />
  )
}
