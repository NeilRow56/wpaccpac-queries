'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { savePeriodSetupAction } from '@/server-actions/period-setup'
import type { PeriodSetupDocV1 } from '@/lib/periods/period-setup'
import { authClient } from '@/lib/auth-client'

function toNumberOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

type Props = {
  clientId: string
  periodId: string
  initial: PeriodSetupDocV1
}

export default function PeriodSetupForm({
  clientId,
  periodId,
  initial
}: Props) {
  const { data: activeOrganization } = authClient.useActiveOrganization()

  const members =
    activeOrganization?.members
      ?.filter(m => m.user?.name)
      .map(m => ({ id: m.id, name: m.user.name })) ?? []

  const form = useForm<PeriodSetupDocV1>({
    defaultValues: initial,
    values: initial
  })

  React.useEffect(() => {
    form.reset(initial)
  }, [initial, form])

  async function onSubmit(values: PeriodSetupDocV1) {
    const res = await savePeriodSetupAction({ clientId, periodId, doc: values })
    if (res.success) toast.success('Saved')
    else toast.error(res.message)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
      {/* Compact, responsive layout */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        {/* Materiality (compact panel) */}
        <div className='w-full min-w-0 rounded-lg border p-4 lg:max-w-[680px] lg:flex-1'>
          <div className='mb-3'>
            <div className='text-primary text-sm font-medium'>
              Planning inputs
            </div>
            <div className='text-muted-foreground text-xs'>
              Used for materiality. If current year is blank, prior can be used.
            </div>
          </div>

          <div className='grid grid-cols-[160px_1fr_1fr] items-end gap-3 text-xs'>
            <div />
            <div className='text-muted-foreground text-center'>Current</div>
            <div className='text-muted-foreground text-center'>Prior</div>
          </div>

          <div className='mt-2 space-y-2'>
            <div className='grid grid-cols-[160px_1fr_1fr] items-center gap-3'>
              <div className='text-sm'>Turnover</div>
              <Input
                type='number'
                className='h-9 text-right tabular-nums'
                {...form.register('materiality.turnover.current', {
                  setValueAs: v =>
                    typeof v === 'string' ? toNumberOrNull(v) : v
                })}
              />
              <Input
                type='number'
                className='h-9 text-right tabular-nums'
                {...form.register('materiality.turnover.prior', {
                  setValueAs: v =>
                    typeof v === 'string' ? toNumberOrNull(v) : v
                })}
              />
            </div>

            <div className='grid grid-cols-[160px_1fr_1fr] items-center gap-3'>
              <div className='text-sm'>Net Profit</div>
              <Input
                type='number'
                className='h-9 text-right tabular-nums'
                {...form.register('materiality.netProfit.current', {
                  setValueAs: v =>
                    typeof v === 'string' ? toNumberOrNull(v) : v
                })}
              />
              <Input
                type='number'
                className='h-9 text-right tabular-nums'
                {...form.register('materiality.netProfit.prior', {
                  setValueAs: v =>
                    typeof v === 'string' ? toNumberOrNull(v) : v
                })}
              />
            </div>
          </div>
        </div>

        {/* Assignments (compact panel) */}
        <div className='w-full min-w-0 rounded-lg border p-4 lg:w-[320px] lg:flex-none'>
          <div className='mb-3 flex items-start justify-between gap-3'>
            <div>
              <div className='text-primary text-sm font-medium'>
                Assignments
              </div>
              <div className='text-muted-foreground flex w-full text-xs'>
                Used across schedules for “completed by / reviewed by”.
              </div>
            </div>

            <Button type='submit' size='sm' className='shrink-0'>
              Save
            </Button>
          </div>

          <div className='space-y-3'>
            <div className='grid grid-cols-[120px_1fr] items-center gap-3'>
              <div className='text-sm'>Reviewer</div>
              <div className='min-w-0'>
                <select
                  className='bg-background h-9 w-[150px] min-w-0 rounded-md border px-3 text-sm'
                  {...form.register('assignments.reviewerId')}
                >
                  <option value=''>—</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='grid grid-cols-[120px_1fr] items-center gap-3'>
              <div className='text-sm'>Completed by</div>
              <div className='min-w-0'>
                <select
                  className='bg-background h-9 w-[150px] min-w-0 rounded-md border px-3 text-sm'
                  {...form.register('assignments.completedById')}
                >
                  <option value=''>—</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
