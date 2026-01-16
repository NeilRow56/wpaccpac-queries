'use client'

import * as React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, FolderTree, Package } from 'lucide-react'
import { upsertAccountingPeriodNoteAction } from '@/server-actions/accounting-period-notes'
import type { PeriodStatus } from '@/db/schema'

type ClientOverviewProps = {
  clientId: string
  client: {
    id: string
    name: string
    entity_type: string
    notes: string | null
    active: boolean
    createdAt: Date | null
    updatedAt: Date | null
  }
  counts: {
    assets: number
    categories: number
    periods: number
  }
  currentPeriod: null | {
    id: string
    periodName: string
    startDate: string
    endDate: string
    status: PeriodStatus
    isCurrent: boolean
  }
  currentPeriodNote: null | {
    periodId: string
    notes: string
    updatedAt: Date | null
  }
  plannedPeriodId: string | null
}

function formatYmdGb(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function ClientOverview(props: ClientOverviewProps) {
  const {
    clientId,
    client,
    counts,
    currentPeriod,
    currentPeriodNote,
    plannedPeriodId
  } = props

  const [noteDraft, setNoteDraft] = React.useState(
    currentPeriodNote?.notes ?? ''
  )
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setNoteDraft(currentPeriodNote?.notes ?? '')
  }, [currentPeriodNote?.notes])

  const canEditPeriodNote = !!currentPeriod && currentPeriod.status === 'OPEN'

  const handleSave = async () => {
    if (!currentPeriod) return
    setSaving(true)
    try {
      const res = await upsertAccountingPeriodNoteAction({
        clientId,
        periodId: currentPeriod.id,
        notes: noteDraft
      })

      if (!res.success) {
        toast.error(res.error || 'Failed to save notes')
        return
      }
      toast.success('Period notes saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='grid gap-4 lg:grid-cols-3'>
      {/* Left: Client profile */}
      <Card className='lg:col-span-2'>
        <CardHeader>
          <CardTitle>Client overview</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant={client.active ? 'default' : 'secondary'}>
              {client.active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant='outline'>{client.entity_type}</Badge>
          </div>

          <div className='grid gap-3 sm:grid-cols-3'>
            <Stat
              label='Fixed assets'
              value={String(counts.assets)}
              icon={<Package className='h-4 w-4' />}
            />
            <Stat
              label='Asset categories'
              value={String(counts.categories)}
              icon={<FolderTree className='h-4 w-4' />}
            />
            <Stat
              label='Accounting periods'
              value={String(counts.periods)}
              icon={<Calendar className='h-4 w-4' />}
            />
          </div>

          {client.notes ? (
            <div className='rounded-md border p-3'>
              <div className='text-muted-foreground text-xs'>Client notes</div>
              <div className='mt-1 text-sm whitespace-pre-wrap'>
                {client.notes}
              </div>
            </div>
          ) : (
            <div className='text-muted-foreground text-sm'>
              No client notes yet.
            </div>
          )}

          <div className='flex flex-wrap gap-2 pt-2'>
            <Button asChild variant='outline' size='sm'>
              <Link href={`/organisation/clients/${clientId}/asset-categories`}>
                <FolderTree className='mr-2 h-4 w-4' />
                Asset categories
              </Link>
            </Button>

            <Button asChild variant='outline' size='sm'>
              <Link href={`/organisation/clients/${clientId}/fixed-assets`}>
                <Package className='mr-2 h-4 w-4' />
                Fixed assets
              </Link>
            </Button>

            <Button asChild variant='outline' size='sm'>
              <Link
                href={`/organisation/clients/${clientId}/accounting-periods`}
              >
                <Calendar className='mr-2 h-4 w-4' />
                Accounting periods
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right: Current period + period notes */}
      <Card>
        <CardHeader>
          <CardTitle>Current period</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {!currentPeriod ? (
            <div className='space-y-2'>
              <p className='font-medium text-red-600'>
                No open accounting period
              </p>
              <p className='text-muted-foreground text-sm'>
                Create a period and open it via Planning to enable depreciation
                & posting.
              </p>

              <div className='flex flex-col gap-2'>
                <Button asChild variant='outline' size='sm'>
                  <Link
                    href={`/organisation/clients/${clientId}/accounting-periods`}
                  >
                    Go to accounting periods
                  </Link>
                </Button>

                {plannedPeriodId ? (
                  <Button asChild size='sm'>
                    <Link
                      href={`/organisation/clients/${clientId}/accounting-periods/${plannedPeriodId}/planning`}
                    >
                      Open via Planning
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className='rounded-md border p-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='truncate font-medium'>
                      {currentPeriod.periodName}
                    </div>
                    <div className='text-muted-foreground text-xs'>
                      {formatYmdGb(currentPeriod.startDate)} →{' '}
                      {formatYmdGb(currentPeriod.endDate)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      currentPeriod.status === 'OPEN' ? 'default' : 'secondary'
                    }
                  >
                    {currentPeriod.status}
                  </Badge>
                </div>
              </div>

              <div>
                <div className='flex items-center justify-between'>
                  <div className='text-sm font-medium'>Period notes</div>
                  {!canEditPeriodNote ? (
                    <div className='text-muted-foreground text-xs'>
                      Read-only (period not OPEN)
                    </div>
                  ) : null}
                </div>

                <Textarea
                  className='mt-2 min-h-[180px]'
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  placeholder={
                    canEditPeriodNote
                      ? 'Add period-specific notes here (adjustments, exceptions, approvals, etc.)'
                      : 'Notes are available once a period is OPEN.'
                  }
                  disabled={!canEditPeriodNote || saving}
                />

                <div className='mt-2 flex justify-end'>
                  <Button
                    size='sm'
                    onClick={handleSave}
                    disabled={!canEditPeriodNote || saving}
                  >
                    {saving ? 'Saving…' : 'Save notes'}
                  </Button>
                </div>

                {currentPeriodNote?.updatedAt ? (
                  <div className='text-muted-foreground mt-2 text-xs'>
                    Last updated:{' '}
                    {currentPeriodNote.updatedAt.toLocaleString('en-GB')}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat(props: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className='rounded-md border p-3'>
      <div className='text-muted-foreground flex items-center gap-2 text-xs'>
        {props.icon}
        {props.label}
      </div>
      <div className='mt-1 text-xl font-semibold'>{props.value}</div>
    </div>
  )
}
