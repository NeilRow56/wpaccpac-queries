// app/organisation/clients/[clientId]/accounting-periods/[periodId]/sales-debtors/page.tsx

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { and, desc, eq, lt } from 'drizzle-orm'
import { Calendar } from 'lucide-react'

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import { Button } from '@/components/ui/button'

import { db } from '@/db'
import { accountingPeriods } from '@/db/schema'

import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'
import { getPeriodSetupAction } from '@/server-actions/period-setup'

import { getDocSignoffHistory } from '@/lib/planning/doc-signoff-read'
import DocSignoffStrip from '../planning/_components/doc-signoff-strip'
import SignoffHistoryPopover from '../planning/_components/signoff-history-popover'

import SimpleScheduleForm from '../taxation/_components/simple-schedule-form'
import {
  getDebtorsScheduleAction,
  saveDebtorsScheduleAction
} from '@/server-actions/simple-schedules/debtors'
import { getDebtorsPrepaymentsScheduleAction } from '@/server-actions/schedules/debtors-prepayments'

export default async function DebtorsPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const client = await getClientById(clientId)
  const period = await getAccountingPeriodById(periodId)

  if (!client || !period) notFound()

  const code = 'B61-debtors'

  const signoff = await getDocSignoffHistory({ clientId, periodId, code })
  const row = signoff.row

  const setupRes = await getPeriodSetupAction({ clientId, periodId })
  if (!setupRes.success) notFound()
  const defaultReviewerId = setupRes.data.assignments.reviewerId
  const defaultCompletedById = setupRes.data.assignments.completedById

  const crumbs = buildPeriodLeafBreadcrumbs({
    clientId,
    clientName: client.name,
    periodId,
    periodName: period.periodName,
    leafLabel: 'Debtors',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/sales-debtors`
  })

  const priorPeriod = await db
    .select()
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

  if (!period || period.id !== periodId) {
    return (
      <div className='mb-4 rounded-lg border p-4'>
        <Breadcrumbs crumbs={crumbs} />
        <div className='flex items-start gap-3'>
          <Calendar className='text-muted-foreground h-5 w-5' />
          <div>
            <p className='font-medium text-red-600'>
              No open accounting period
            </p>
            <p className='text-muted-foreground text-sm'>
              You must have the selected accounting period open to edit sales
              and debtors.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const res = await getDebtorsScheduleAction({ clientId, periodId })
  if (!res.success) notFound()

  const prepayRes = await getDebtorsPrepaymentsScheduleAction({
    clientId,
    periodId
  })
  const prepaymentsTotal = prepayRes.success
    ? prepayRes.data.totals.current
    : null

  const currentDoc = res.data.current

  const patchedCurrent = {
    ...currentDoc,
    sections: currentDoc.sections.map(s => {
      if (s.id !== 'summary') return s
      return {
        ...s,
        lines: s.lines.map(l => {
          if (l.kind !== 'INPUT') return l
          if (l.id !== 'prepayments') return l
          return { ...l, amount: prepaymentsTotal }
        })
      }
    })
  }

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <Breadcrumbs crumbs={crumbs} />

      <div className='flex items-center justify-between gap-3'>
        <span>
          <h1 className='text-primary text-lg font-semibold'>Debtors</h1>
        </span>

        <div className='flex flex-col items-start gap-2 pr-2 xl:flex-row'>
          <DocSignoffStrip
            clientId={clientId}
            periodId={periodId}
            code={code}
            reviewedAt={row?.reviewedAt ?? null}
            reviewedByMemberId={row?.reviewedByMemberId ?? null}
            defaultReviewerId={defaultReviewerId}
            completedAt={row?.completedAt ?? null}
            completedByMemberId={row?.completedByMemberId ?? null}
            defaultCompletedById={defaultCompletedById}
          />

          <SignoffHistoryPopover events={signoff.history ?? []} />

          <Button asChild variant='outline' size='sm' className='text-blue-600'>
            <Link
              href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/B61-debtors_wp`}
            >
              B61 Debtors and sales work programme
            </Link>
          </Button>
        </div>
      </div>

      <Button asChild variant='outline' size='sm'>
        <Link
          href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/sales-debtors/prepayments`}
        >
          Prepayments schedule
        </Link>
      </Button>

      <SimpleScheduleForm
        title='Debtors'
        code={code}
        clientId={clientId}
        periodId={periodId}
        initial={patchedCurrent}
        prior={res.data.prior}
        priorPeriod={priorPeriod}
        onSave={saveDebtorsScheduleAction}
        derivedLineIds={['prepayments']}
        derivedHelpByLineId={{
          prepayments: 'Derived from the Prepayments schedule.'
        }}
      />
    </div>
  )
}
