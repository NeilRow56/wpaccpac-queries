// src/app/organisation/clients/[clientId]/accounting-periods/[periodId]/accounts-completion/page.tsx
import { redirect } from 'next/navigation'
import { ACCOUNTS_COMPLETION_DOCS } from '@/lib/accounts-completion/docs'

export default async function AccountsCompletionIndex({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  // Default to first accounts-completion doc (A11)
  const first = ACCOUNTS_COMPLETION_DOCS[0]

  redirect(
    `/organisation/clients/${clientId}/accounting-periods/${periodId}/accounts-completion/${first.code}`
  )
}
