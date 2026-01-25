// app/organisation/clients/[clientId]/accounting-periods/[periodId]/taxation/page.tsx

import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/navigation/breadcrumb'

import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'
import SimpleScheduleForm from './_components/simple-schedule-form'
import {
  getTaxationScheduleAction,
  saveTaxationScheduleAction
} from '@/server-actions/simple-schedules/taxation'
import { Calendar } from 'lucide-react'
import { accountingPeriods } from '@/db/schema'
import { db } from '@/db'
import { and, desc, eq, lt } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import DocSignoffStrip from '../planning/_components/doc-signoff-strip'
import { getDocSignoffHistory } from '@/lib/planning/doc-signoff-read'
import { getPeriodSetupAction } from '@/server-actions/period-setup'

import SignoffHistoryPopover from '../planning/_components/signoff-history-popover'

export default async function TaxationPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const client = await getClientById(clientId)
  const period = await getAccountingPeriodById(periodId)

  if (!client || !period) notFound()

  const code = 'B61-taxation'

  const signoff = await getDocSignoffHistory({ clientId, periodId, code })
  const row = signoff.row
  // const history = signoff.history

  const setupRes = await getPeriodSetupAction({ clientId, periodId })
  if (!setupRes.success) notFound()
  const defaultReviewerId = setupRes.data.assignments.reviewerId

  const defaultCompletedById = setupRes.data.assignments.completedById

  const crumbs = buildPeriodLeafBreadcrumbs({
    clientId,
    clientName: client.name,
    periodId,
    periodName: period.periodName,
    leafLabel: 'Taxation',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/taxation`
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
              You must have the selected accounting period open to edit
              taxation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const res = await getTaxationScheduleAction({ clientId, periodId })

  if (!res.success) {
    notFound()
  }

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <Breadcrumbs crumbs={crumbs} />
      <div className='flex items-center justify-between gap-3'>
        <span>
          <h1 className='text-primary text-lg font-semibold'>Taxation</h1>
        </span>

        <div className='flex flex-col items-start gap-2 pr-2 xl:flex-row'>
          {/* whatever you already have on the right */}

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

          <SignoffHistoryPopover events={signoff?.history ?? []} />
          <Button asChild variant='outline' size='sm' className='text-blue-600'>
            <Link
              href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/B61-taxation_wp`}
            >
              B61 Taxation work programme
            </Link>
          </Button>
        </div>
      </div>

      <SimpleScheduleForm
        title='Taxation'
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        prior={res.data.prior}
        priorPeriod={priorPeriod}
        onSave={saveTaxationScheduleAction}
        templateAttachmentIds={['tax-comp', 'tax-proof']}
      />
    </div>
  )
}
