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
  const raw = v.trim()
  if (raw === '') return null

  // Allow common accounting formats: commas, currency symbols, spaces, (123) negatives
  const isParenNegative = /^\(.*\)$/.test(raw)
  const cleaned = raw.replace(/[£,$\s]/g, '').replace(/^\((.*)\)$/, '$1')

  if (cleaned === '') return null

  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null

  return isParenNegative ? -n : n
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

  function nameToInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
    return (parts[0]![0]! + parts.at(-1)![0]!).toUpperCase()
  }

  function displayReviewerName(
    fullName: string,
    allNamesInContext: string[]
  ): string {
    const initials = nameToInitials(fullName)

    const initialsCount = allNamesInContext.filter(
      n => nameToInitials(n) === initials
    ).length

    if (initialsCount <= 1) return initials

    // Collision → First name + last initial
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    const first = parts[0] ?? fullName
    const lastInitial = parts.length > 1 ? parts.at(-1)![0] : ''

    return `${first} ${lastInitial}`.trim()
  }

  // Build member options. IMPORTANT: store memberId in the doc.
  const members = React.useMemo(() => {
    const orgMembers = activeOrganization?.members ?? []
    return orgMembers
      .filter(m => m.user?.name && m.user?.id)
      .map(m => ({
        memberId: m.id,
        userId: m.user!.id,
        name: m.user!.name
      }))
  }, [activeOrganization?.members])

  const memberNames = React.useMemo(() => members.map(m => m.name), [members])

  const memberOptions = React.useMemo(() => {
    return members.map(m => ({
      id: m.memberId, // option value is MEMBER id
      label: displayReviewerName(m.name, memberNames)
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, memberNames])

  // Map userId -> memberId for compatibility if older data saved user ids.
  const userIdToMemberId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.userId, m.memberId)
    return map
  }, [members])

  const form = useForm<PeriodSetupDocV1>({
    defaultValues: initial
  })

  React.useEffect(() => {
    form.reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  const reviewerId = form.watch('assignments.reviewerId')
  const completedById = form.watch('assignments.completedById')

  const reviewerValue = reviewerId ?? ''
  const completedValue = completedById ?? ''

  const reviewerExists =
    !reviewerValue || memberOptions.some(o => o.id === reviewerValue)
  const completedExists =
    !completedValue || memberOptions.some(o => o.id === completedValue)

  // Compatibility shim:
  // If stored reviewer/completedBy IDs are userIds, convert them to memberIds so selects show correctly.
  React.useEffect(() => {
    if (members.length === 0) return

    const reviewer = form.getValues('assignments.reviewerId')
    const completed = form.getValues('assignments.completedById')

    if (reviewer && userIdToMemberId.has(reviewer)) {
      form.setValue('assignments.reviewerId', userIdToMemberId.get(reviewer)!, {
        shouldDirty: true
      })
    }

    if (completed && userIdToMemberId.has(completed)) {
      form.setValue(
        'assignments.completedById',
        userIdToMemberId.get(completed)!,
        { shouldDirty: true }
      )
    }
  }, [members.length, userIdToMemberId, form])

  async function onSubmit(values: PeriodSetupDocV1) {
    const res = await savePeriodSetupAction({ clientId, periodId, doc: values })
    if (res.success) toast.success('Saved')
    else toast.error(res.message)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
      <div className='flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-start xl:justify-between'>
        {/* Materiality */}
        <div className='w-full min-w-0 rounded-lg border p-4 xl:max-w-[520px] xl:flex-none'>
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
            <div className='text-primary text-center'>Current (£)</div>
            <div className='text-center text-red-400'>Prior (£)</div>
          </div>

          <div className='mt-2 space-y-2'>
            <div className='grid grid-cols-[160px_1fr_1fr] items-center gap-3'>
              <div className='text-sm'>Turnover</div>
              <Input
                type='text'
                inputMode='numeric'
                className='h-9 w-full max-w-[14ch] min-w-0 justify-self-end border-gray-200 text-right tabular-nums'
                {...form.register('materiality.turnover.current', {
                  setValueAs: v =>
                    typeof v === 'string' ? toNumberOrNull(v) : v
                })}
              />
              <Input
                type='text'
                inputMode='numeric'
                className='h-9 w-full max-w-[14ch] min-w-0 justify-self-end border-gray-200 text-right tabular-nums'
                {...form.register('materiality.turnover.prior', {
                  setValueAs: v =>
                    typeof v === 'string' ? toNumberOrNull(v) : v
                })}
              />
            </div>

            <div className='grid grid-cols-[160px_1fr_1fr] items-center gap-3'>
              <div className='text-sm'>Net Profit</div>
              <Input
                type='text'
                inputMode='numeric'
                className='h-9 w-full max-w-[14ch] min-w-0 justify-self-end border-gray-200 text-right tabular-nums'
                {...form.register('materiality.netProfit.current', {
                  setValueAs: v =>
                    typeof v === 'string' ? toNumberOrNull(v) : v
                })}
              />
              <Input
                type='text'
                inputMode='numeric'
                className='h-9 w-full max-w-[14ch] min-w-0 justify-self-end border-gray-200 text-right tabular-nums'
                {...form.register('materiality.netProfit.prior', {
                  setValueAs: v =>
                    typeof v === 'string' ? toNumberOrNull(v) : v
                })}
              />
            </div>
          </div>
        </div>

        {/* Assignments */}
        <div className='w-full min-w-0 rounded-lg border p-4 xl:w-[320px] xl:flex-none'>
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
            <div className='grid min-w-0 grid-cols-[120px_minmax(0,1fr)] items-center gap-3'>
              <div className='text-sm'>Reviewer</div>
              <div className='min-w-0'>
                <select
                  className='bg-background h-9 w-full min-w-0 rounded-md border px-3 text-sm'
                  {...form.register('assignments.reviewerId')}
                  value={reviewerValue}
                  onChange={e =>
                    form.setValue(
                      'assignments.reviewerId',
                      e.target.value || null,
                      { shouldDirty: true }
                    )
                  }
                >
                  <option value=''>—</option>

                  {!reviewerExists && (
                    <option value={reviewerValue}>(Unknown member)</option>
                  )}

                  {memberOptions.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='grid min-w-0 grid-cols-[120px_minmax(0,1fr)] items-center gap-3'>
              <div className='text-sm'>Completed by</div>
              <div className='min-w-0'>
                <select
                  className='bg-background h-9 w-full min-w-0 rounded-md border px-3 text-sm'
                  {...form.register('assignments.completedById')}
                  value={completedValue}
                  onChange={e =>
                    form.setValue(
                      'assignments.completedById',
                      e.target.value || null,
                      { shouldDirty: true }
                    )
                  }
                >
                  <option value=''>—</option>

                  {!completedExists && (
                    <option value={completedValue}>(Unknown member)</option>
                  )}

                  {memberOptions.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
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
