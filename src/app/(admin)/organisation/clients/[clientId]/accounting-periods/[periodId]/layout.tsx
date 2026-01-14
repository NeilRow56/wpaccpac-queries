import { getAccountingPeriodById } from '@/server-actions/accounting-periods'
import { getClientById } from '@/server-actions/clients'
import { notFound } from 'next/navigation'

type Params = { clientId: string; periodId: string }

export default async function PeriodLayout(props: {
  params: Promise<Params> // Next 15/16 compatible
  children: React.ReactNode
}) {
  const { clientId, periodId } = await props.params

  // Optional: if you already guard client exists in parent layout,
  // you can remove this.
  const client = await getClientById(clientId)
  if (!client) notFound()

  const period = await getAccountingPeriodById(periodId)
  if (!period) notFound()

  // 🔐 Critical protection: period must belong to client
  if (period.clientId !== clientId) notFound()

  const isLocked = period.status !== 'OPEN' // or whatever enum you use

  return (
    <>
      {/* Optional UX banner */}
      {isLocked ? (
        <div className='mb-3 rounded-md border p-3 text-sm'>
          This period is locked. Posting and edits are disabled..
        </div>
      ) : null}

      {props.children}
    </>
  )
}
