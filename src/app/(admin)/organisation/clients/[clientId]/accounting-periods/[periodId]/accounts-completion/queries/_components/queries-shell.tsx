// src/app/organisation/clients/[clientId]/accounting-periods/[periodId]/accounts-completion/queries/_components/queries-shell.tsx

import QueriesList from './queries-list'
import QueryEditorPanel from './query-editor-panel'

type ListRow = {
  id: string
  number: number
  title: string | null
  status: 'OPEN' | 'ANSWERED' | 'CLEARED'
  createdAt: string
  createdByMemberId: string
  createdByName: string | null
  createdByEmail: string | null
  lastResponseAt: string | null
  lastRespondedByMemberId: string | null
  lastRespondedByName: string | null
  lastRespondedByEmail: string | null
}

type Selected = {
  query: {
    id: string
    clientId: string
    periodId: string
    number: number
    title: string | null
    status: 'OPEN' | 'ANSWERED' | 'CLEARED'
    questionJson: unknown
    createdAt: string
    createdByMemberId: string
    createdByName: string | null
    createdByEmail: string | null
  }
  responses: Array<{
    id: string
    responseJson: unknown
    createdAt: string
    createdByMemberId: string
    createdByName: string | null
    createdByEmail: string | null
  }>
}

export default function QueriesShell(props: {
  clientId: string
  periodId: string
  queryId: string
  list: ListRow[]
  selected: Selected
}) {
  const { clientId, periodId, queryId, list, selected } = props

  return (
    <div className='container mx-auto max-w-6xl py-8'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <h1 className='text-primary text-lg font-semibold'>Accounts queries</h1>
      </div>

      {/* <div className='grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]'> */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]'>
        <div className='rounded-lg border p-3'>
          <QueriesList
            clientId={clientId}
            periodId={periodId}
            activeId={queryId}
            rows={list}
          />
        </div>

        <div className='rounded-lg border p-4'>
          <QueryEditorPanel
            clientId={clientId}
            periodId={periodId}
            activeQueryId={queryId}
            initial={selected}
          />
        </div>
      </div>
    </div>
  )
}
