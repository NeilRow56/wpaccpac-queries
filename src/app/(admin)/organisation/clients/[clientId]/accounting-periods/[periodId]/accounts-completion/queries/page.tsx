import { notFound } from 'next/navigation'

import QueriesShell from './_components/queries-shell'
import {
  createAccountsQueryAction,
  getAccountsQueryAction,
  listAccountsQueriesAction
} from '@/server-actions/accounts/queries'

export default async function QueriesIndexPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string }>
}) {
  const { clientId, periodId } = await params

  // 1) List queries
  //   const listRes = await listAccountsQueriesAction({ clientId, periodId })
  //   if (!listRes.success) notFound()
  const listRes = await listAccountsQueriesAction({ clientId, periodId })
  if (!listRes.success) throw new Error(listRes.message)

  let list = listRes.data

  // 2) Ensure at least one exists
  let activeId = list[0]?.id ?? null

  if (!activeId) {
    const created = await createAccountsQueryAction({
      clientId,
      periodId,
      revalidatePath: `/organisation/clients/${clientId}/accounting-periods/${periodId}/accounts-completion/queries`
    })
    if (!created.success) notFound()

    activeId = created.data.id

    // refresh list so the sidebar shows the created one
    const listRes2 = await listAccountsQueriesAction({ clientId, periodId })
    if (!listRes2.success) notFound()
    list = listRes2.data
  }

  // 3) Load the selected query
  const getRes = await getAccountsQueryAction({ queryId: activeId })
  if (!getRes.success) notFound()

  return (
    <QueriesShell
      clientId={clientId}
      periodId={periodId}
      queryId={activeId}
      list={list}
      selected={getRes.data}
    />
  )
}
