// src/app/organisation/clients/[clientId]/accounting-periods/[periodId]/accounts-completion/A11-financial_statements/page.tsx
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/navigation/breadcrumb'
import {
  getFinancialStatementsScheduleAction,
  saveFinancialStatementsScheduleAction
} from '@/server-actions/simple-schedules/a11-financial-statements'
import SimpleScheduleForm from '../../taxation/_components/simple-schedule-form'

export default async function FinancialStatementsPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  const res = await getFinancialStatementsScheduleAction({ clientId, periodId })
  if (!res.success) notFound()

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <Breadcrumbs
        crumbs={[
          {
            label: 'Financial statements',
            href: `/organisation/clients/${clientId}/accounting-periods/${periodId}/accounts-completion/A11-financial_statements`
          }
        ]}
      />

      <h1 className='text-primary text-lg font-semibold'>
        Financial statements
      </h1>

      <SimpleScheduleForm
        title='Financial statements'
        clientId={clientId}
        periodId={periodId}
        initial={res.data.current}
        onSave={saveFinancialStatementsScheduleAction}
        derivedLineIds={[]}
        derivedHelpByLineId={{}}
        templateAttachmentIds={['financial-statements-pdf']}
      />
    </div>
  )
}
