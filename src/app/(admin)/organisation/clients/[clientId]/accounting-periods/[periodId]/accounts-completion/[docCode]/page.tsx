// src/app/organisation/clients/[clientId]/accounting-periods/[periodId]/accounts-completion/[docCode]/page.tsx
import { notFound } from 'next/navigation'

import { Calendar } from 'lucide-react'

import { Breadcrumbs } from '@/components/navigation/breadcrumb'

import { getClientById } from '@/server-actions/clients'
import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { buildPeriodLeafBreadcrumbs } from '@/lib/period-breadcrumbs'
import { getPeriodSetupAction } from '@/server-actions/period-setup'

import { getDocSignoffHistory } from '@/lib/planning/doc-signoff-read'
import DocSignoffStrip from '../../planning/_components/doc-signoff-strip'
import SignoffHistoryPopover from '../../planning/_components/signoff-history-popover'

import SimpleScheduleForm from '../../taxation/_components/simple-schedule-form'
import {
  getFinancialStatementsScheduleAction,
  saveFinancialStatementsScheduleAction
} from '@/server-actions/simple-schedules/a11-financial-statements'

import { PdfPreview } from '../_components/pdf-preview'
import { A11Status, getA11Status } from '@/lib/accounts-completion/all-status'
import { A11StatusBadge } from '../_components/all-status-badge'

const DOC_CODE = 'A11-financial_statements'
const ROUTE_CODE = 'A11'

const TEMPLATE_ATTACHMENT_IDS = ['financial-statements-pdf'] as const

type AttachmentLike = {
  id?: string
  url?: string | null
  mimeType?: string | null
  filename?: string | null
}

function pickPdfUrl(
  attachments: AttachmentLike[] | null | undefined
): string | null {
  if (!attachments?.length) return null

  const pdfByMime = attachments.find(
    a => a?.url && a?.mimeType === 'application/pdf'
  )?.url
  if (pdfByMime) return pdfByMime

  const pdfByName = attachments.find(a => {
    const name = (a?.filename ?? '').toLowerCase()
    return Boolean(a?.url) && name.endsWith('.pdf')
  })?.url
  if (pdfByName) return pdfByName

  const firstUrl = attachments.find(a => Boolean(a?.url))?.url ?? null
  return firstUrl
}

export default async function AccountsCompletionDocPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string; docCode: string }>
}) {
  const { clientId, periodId, docCode } = await params

  // For now only A11 exists
  if (docCode !== ROUTE_CODE) notFound()

  const client = await getClientById(clientId)
  const period = await getAccountingPeriodById(periodId)
  if (!client || !period) notFound()

  const signoff = await getDocSignoffHistory({
    clientId,
    periodId,
    code: DOC_CODE
  })
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
    leafLabel: 'Financial statements',
    leafHref: `/organisation/clients/${clientId}/accounting-periods/${periodId}/accounts-completion/${ROUTE_CODE}`
  })

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
              Financial statements.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const res = await getFinancialStatementsScheduleAction({ clientId, periodId })
  if (!res.success) notFound()

  // ---- Status + PDF preview wiring (no schema changes) ----
  const hasSignoff = Boolean(row?.reviewedAt || row?.completedAt)
  const attachments =
    (res.data.current as { attachments?: AttachmentLike[] | null })
      .attachments ?? null
  const pdfUrl = pickPdfUrl(attachments)

  const status: A11Status = getA11Status({
    hasPdf: Boolean(pdfUrl),
    hasSignoff
  })

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <Breadcrumbs crumbs={crumbs} />

      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <h1 className='text-primary text-lg font-semibold'>
            Financial statements
          </h1>
          <A11StatusBadge status={status} />
        </div>

        <div className='flex flex-col items-start gap-2 pr-2 xl:flex-row'>
          <DocSignoffStrip
            clientId={clientId}
            periodId={periodId}
            code={DOC_CODE}
            reviewedAt={row?.reviewedAt ?? null}
            reviewedByMemberId={row?.reviewedByMemberId ?? null}
            defaultReviewerId={defaultReviewerId}
            completedAt={row?.completedAt ?? null}
            completedByMemberId={row?.completedByMemberId ?? null}
            defaultCompletedById={defaultCompletedById}
          />

          <SignoffHistoryPopover events={signoff.history ?? []} />
        </div>
      </div>

      <SimpleScheduleForm
        title='Financial statements'
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        onSave={saveFinancialStatementsScheduleAction}
        derivedLineIds={[]}
        derivedHelpByLineId={{}}
        templateAttachmentIds={[...TEMPLATE_ATTACHMENT_IDS]}
      />

      {pdfUrl ? (
        <div className='space-y-3'>
          <h2 className='text-base font-medium'>Preview</h2>
          <PdfPreview url={pdfUrl} title='Financial statements PDF' />
        </div>
      ) : (
        <div className='text-muted-foreground rounded-xl border p-4 text-sm'>
          Upload the final accounts PDF to enable preview.
        </div>
      )}
    </div>
  )
}
