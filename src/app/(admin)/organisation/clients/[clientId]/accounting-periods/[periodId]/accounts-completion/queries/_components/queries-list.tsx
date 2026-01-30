// src/app/organisation/clients/[clientId]/accounting-periods/[periodId]/accounts-completion/queries/_components/queries-list.tsx

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { createAccountsQueryAction } from '@/server-actions/accounts/queries'

type Row = {
  id: string
  number: number
  title: string | null
  status: 'OPEN' | 'ANSWERED' | 'CLEARED'
  lastResponseAt: string | null
  lastRespondedByName: string | null
}

function statusPill(status: Row['status']) {
  const base = 'rounded-full px-2 py-0.5 text-xs'
  if (status === 'CLEARED') return `${base} bg-green-100 text-green-800`
  if (status === 'ANSWERED') return `${base} bg-blue-100 text-blue-800`
  return `${base} bg-amber-100 text-amber-800`
}

export default function QueriesList(props: {
  clientId: string
  periodId: string
  activeId: string
  rows: Row[]
}) {
  const { clientId, periodId, activeId, rows } = props

  async function onAdd() {
    'use server'
    const created = await createAccountsQueryAction({
      clientId,
      periodId,
      revalidatePath: `/organisation/clients/${clientId}/accounting-periods/${periodId}/accounts-completion/queries`
    })

    if (!created.success) return

    redirect(
      `/organisation/clients/${clientId}/accounting-periods/${periodId}/accounts-completion/queries/${created.data.id}`
    )
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='text-sm font-medium'>Queries</div>

        <form action={onAdd}>
          <Button type='submit' size='sm' variant='outline'>
            <Plus className='mr-2 h-4 w-4' />
            Add new
          </Button>
        </form>
      </div>

      <div className='space-y-1'>
        {rows.map(r => {
          const isActive = r.id === activeId

          return (
            <Link
              key={r.id}
              href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/accounts-completion/queries/${r.id}`}
              className={[
                'hover:bg-muted/40 block rounded-md border px-3 py-2 text-sm',
                isActive ? 'border-primary bg-muted/30' : 'border-transparent'
              ].join(' ')}
            >
              <div className='flex items-center justify-between gap-2'>
                <div className='font-medium'>Q{r.number}</div>
                <span className={statusPill(r.status)}>{r.status}</span>
              </div>

              <div className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                {r.title ?? 'Untitled'}
              </div>

              <div className='text-muted-foreground mt-1 text-[11px]'>
                {r.lastResponseAt
                  ? `Last reply: ${r.lastRespondedByName ?? '—'}`
                  : 'No replies yet'}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
