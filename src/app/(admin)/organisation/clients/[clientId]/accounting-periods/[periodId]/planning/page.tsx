import { db } from '@/db'
import { and, desc, eq, lt } from 'drizzle-orm'
import { accountingPeriods, planningDocs } from '@/db/schema'
import { B_DOCS } from '@/planning/registry'
import PlanningIndexClient from './_components/planning-index-client'
import { notFound } from 'next/navigation'
import { PlanningClient } from './_components/planning-client'

export default async function PlanningIndexPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const period = await db.query.accountingPeriods.findFirst({
    where: and(
      eq(accountingPeriods.id, periodId),
      eq(accountingPeriods.clientId, clientId)
    )
  })
  if (!period) notFound()

  const prev = await db
    .select({
      id: accountingPeriods.id,
      endDate: accountingPeriods.endDate
    })
    .from(accountingPeriods)
    .where(
      and(
        eq(accountingPeriods.clientId, clientId),
        lt(accountingPeriods.endDate, period.startDate)
      )
    )
    .orderBy(desc(accountingPeriods.endDate))
    .limit(1)
    .then(r => r[0] ?? null)

  const currentDocs = await db
    .select({
      code: planningDocs.code,
      isComplete: planningDocs.isComplete
    })
    .from(planningDocs)
    .where(
      and(
        eq(planningDocs.clientId, clientId),
        eq(planningDocs.periodId, periodId)
      )
    )

  const currentByCode = new Map(currentDocs.map(d => [d.code, d] as const))

  const prevDocs = prev
    ? await db
        .select({ code: planningDocs.code })
        .from(planningDocs)
        .where(
          and(
            eq(planningDocs.clientId, clientId),
            eq(planningDocs.periodId, prev.id)
          )
        )
    : []

  const prevSet = new Set(prevDocs.map(d => d.code))

  let availableFromPrevCount = 0
  for (const d of B_DOCS) {
    if (prevSet.has(d.code)) availableFromPrevCount += 1
  }

  const docsForIndex = [...B_DOCS]
    .sort((a, b) => a.order - b.order)
    .map(d => {
      const row = currentByCode.get(d.code)
      return {
        code: d.code,
        title: d.title,
        order: d.order,
        enabled: true,
        isComplete: row?.isComplete ?? false
      }
    })

  return (
    <div className='space-y-4'>
      <PlanningClient
        clientId={clientId}
        periodId={periodId}
        status={period.status}
      />

      {period.status === 'OPEN' && (
        <PlanningIndexClient
          clientId={clientId}
          periodId={periodId}
          docs={docsForIndex}
          hint={
            prev && availableFromPrevCount > 0
              ? { count: availableFromPrevCount, prevPeriodId: prev.id }
              : null
          }
        />
      )}
    </div>
  )
}
