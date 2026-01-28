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
  getCashAtBankLeadScheduleAction,
  saveCashAtBankLeadScheduleAction
} from '@/server-actions/simple-schedules/cash-at-bank'

// -----------------------------
// Constants
// -----------------------------
const CODE = 'B61-cash_at_bank'

// Derived line ids (locked)
const CASH_AT_BANK_LINE_ID = 'cash-at-bank' as const
const BANK_OVERDRAFT_MEMO_LINE_ID = 'bank-overdraft-memo' as const

const DERIVED_LINE_IDS = [
  CASH_AT_BANK_LINE_ID,
  BANK_OVERDRAFT_MEMO_LINE_ID
] as const

const DERIVED_HELP_BY_LINE_ID: Record<
  (typeof DERIVED_LINE_IDS)[number],
  string
> = {
  [CASH_AT_BANK_LINE_ID]:
    'Derived from the Bank accounts schedule. If right of set-off is ON, this is the net bank position (positive only). Otherwise, positive balances only.',
  [BANK_OVERDRAFT_MEMO_LINE_ID]:
    'Derived from the Bank accounts schedule. Shown only when right of set-off is OFF (overdrawn balances only; memo).'
}

// Attachments shown on the lead schedule
const TEMPLATE_ATTACHMENT_IDS = [
  'bank-statements',
  'bank-recon',
  'cash-count'
] as const

export default async function CashAtBankPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const client = await getClientById(clientId)
  const period = await getAccountingPeriodById(periodId)

  if (!client || !period) notFound()

  const signoff = await getDocSignoffHistory({ clientId, periodId, code: CODE })
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
    leafLabel: 'Cash at bank',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/cash-at-bank`
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
              You must have the selected accounting period open to edit cash at
              bank.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const res = await getCashAtBankLeadScheduleAction({ clientId, periodId })
  if (!res.success) notFound()

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <Breadcrumbs crumbs={crumbs} />

      <div className='flex items-center justify-between gap-3'>
        <span>
          <h1 className='text-primary text-lg font-semibold'>
            Cash at bank and in hand
          </h1>
        </span>

        <div className='flex flex-col items-start gap-2 pr-2 xl:flex-row'>
          <DocSignoffStrip
            clientId={clientId}
            periodId={periodId}
            code={CODE}
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
              href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/planning/B61-cash_at_bank_wp`}
            >
              B61 Cash at bank work programme
            </Link>
          </Button>
        </div>
      </div>

      {/* Supporting schedules */}
      <div className='flex flex-col gap-2 sm:flex-row'>
        <Button asChild variant='outline' size='sm'>
          <Link
            href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/cash-at-bank/bank-accounts`}
          >
            Bank accounts schedule
          </Link>
        </Button>
      </div>

      <SimpleScheduleForm
        title='Cash at bank and in hand'
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        prior={res.data.prior}
        priorPeriod={priorPeriod}
        onSave={saveCashAtBankLeadScheduleAction}
        derivedLineIds={[...DERIVED_LINE_IDS]}
        derivedHelpByLineId={DERIVED_HELP_BY_LINE_ID}
        templateAttachmentIds={[...TEMPLATE_ATTACHMENT_IDS]}
      />
    </div>
  )
}
