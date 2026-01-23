import { db } from '@/db'
import { and, desc, eq, lt } from 'drizzle-orm'
import {
  accountingPeriods,
  planningDocs,
  planningDocSignoffs
} from '@/db/schema'
import { B_DOCS } from '@/planning/registry'
import PlanningIndexClient from './_components/planning-index-client'
import { notFound } from 'next/navigation'
import { PlanningClient } from './_components/planning-client'
import PeriodSetupForm from '../_components/period-setup-form'
import { getPeriodSetupAction } from '@/server-actions/period-setup'

export const dynamic = 'force-dynamic'

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

  const setupRes = await getPeriodSetupAction({ clientId, periodId })
  if (!setupRes.success) notFound()

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

  const signoffRows = await db
    .select({
      code: planningDocSignoffs.code,
      reviewedAt: planningDocSignoffs.reviewedAt,
      reviewedByMemberId: planningDocSignoffs.reviewedByMemberId,
      completedAt: planningDocSignoffs.completedAt,
      completedByMemberId: planningDocSignoffs.completedByMemberId
    })
    .from(planningDocSignoffs)
    .where(
      and(
        eq(planningDocSignoffs.clientId, clientId),
        eq(planningDocSignoffs.periodId, periodId)
      )
    )

  const signoffsByCode = new Map(signoffRows.map(r => [r.code, r] as const))

  const docsForIndex = [...B_DOCS]
    .sort((a, b) => a.order - b.order)
    .map(d => {
      const row = currentByCode.get(d.code)
      const signoff = signoffsByCode.get(d.code)

      return {
        code: d.code,
        title: d.title,
        order: d.order,
        enabled: true,
        isComplete: row?.isComplete ?? false,

        // NEW (optional but recommended)
        reviewedAt: signoff?.reviewedAt ?? null,
        reviewedByMemberId: signoff?.reviewedByMemberId ?? null,
        completedAt: signoff?.completedAt ?? null,
        completedByMemberId: signoff?.completedByMemberId ?? null
      }
    })

  return (
    <div className='space-y-4'>
      <PlanningClient
        clientId={clientId}
        periodId={periodId}
        status={period.status}
      />

      <PeriodSetupForm
        clientId={clientId}
        periodId={periodId}
        initial={setupRes.data}
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
          defaults={{
            reviewerId: setupRes.data.assignments.reviewerId,
            completedById: setupRes.data.assignments.completedById
          }}
        />
      )}
    </div>
  )
}
