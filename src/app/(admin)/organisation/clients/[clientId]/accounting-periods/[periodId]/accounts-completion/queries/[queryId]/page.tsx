import { notFound } from 'next/navigation'

import {
  getAccountsQueryAction,
  listAccountsQueriesAction
} from '@/server-actions/accounts/queries'
import QueriesShell from '../_components/queries-shell'

export default async function QueryDetailPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string; queryId: string }>
}) {
  const { clientId, periodId, queryId } = await params

  const listRes = await listAccountsQueriesAction({ clientId, periodId })
  if (!listRes.success) notFound()

  const getRes = await getAccountsQueryAction({ queryId })
  if (!getRes.success) notFound()

  return (
    <QueriesShell
      clientId={clientId}
      periodId={periodId}
      queryId={queryId}
      list={listRes.data}
      selected={getRes.data}
    />
  )
}
