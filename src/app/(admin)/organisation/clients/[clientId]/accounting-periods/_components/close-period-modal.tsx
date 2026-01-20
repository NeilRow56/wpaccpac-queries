'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { closeAccountingPeriodAction } from '@/server-actions/accounting-periods'
import { AccountingPeriod } from '@/domain/accounting-periods/types'

type Props = {
  period: AccountingPeriod
  clientId: string
  onClose: () => void
}

/* -----------------------------
 * Date helpers (YYYY-MM-DD for DB)
 * ----------------------------- */

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value)
}

function toYMD(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addYears(date: Date, years: number) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

/* -----------------------------
 * UK display helpers
 * ----------------------------- */

function formatGB(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

function formatMonYearGB(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric'
  }).format(date)
}

/**
 * Preferred default naming convention:
 *   "Jan 2025 – Dec 2025"
 */
function autoPeriodNameFromStartEndYMD(startYmd: string, endYmd: string) {
  const start = new Date(startYmd)
  const end = new Date(endYmd)
  return `${formatMonYearGB(start)} \u2013 ${formatMonYearGB(end)}`
}

// Default: next period starts the day after current ends,
// and runs for 1 year (end = start + 1 year - 1 day).
function defaultNextPeriod(current: AccountingPeriod) {
  const currentEnd = toDate(current.endDate)
  const nextStart = addDays(currentEnd, 1)
  const nextEnd = addDays(addYears(nextStart, 1), -1)

  const startDate = toYMD(nextStart)
  const endDate = toYMD(nextEnd)

  return {
    startDate,
    endDate,
    periodName: autoPeriodNameFromStartEndYMD(startDate, endDate)
  }
}

export function ClosePeriodModal({ period, clientId, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const suggested = useMemo(() => defaultNextPeriod(period), [period])

  const [nextStartDate, setNextStartDate] = useState(suggested.startDate)
  const [nextEndDate, setNextEndDate] = useState(suggested.endDate)
  const [nextPeriodName, setNextPeriodName] = useState(suggested.periodName)

  // Tracks whether the user has manually edited the period name
  const [isCustomName, setIsCustomName] = useState(false)

  const [override, setOverride] = useState<null | {
    completed: number
    total: number
    incompleteCodes?: string[]
  }>(null)

  function clearOverride() {
    setOverride(null)
  }

  const currentEnd = useMemo(() => toDate(period.endDate), [period])
  const currentEndGB = useMemo(() => formatGB(currentEnd), [currentEnd])

  const defaultName = useMemo(
    () => autoPeriodNameFromStartEndYMD(nextStartDate, nextEndDate),
    [nextStartDate, nextEndDate]
  )

  function resetToDefaultName() {
    clearOverride()
    setIsCustomName(false)
    setNextPeriodName(defaultName)
  }

  const validation = useMemo(() => {
    if (!nextStartDate || !nextEndDate || !nextPeriodName.trim()) {
      return { ok: false, message: 'Please complete the next period details.' }
    }

    const start = new Date(nextStartDate)
    const end = new Date(nextEndDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { ok: false, message: 'Next period dates are invalid.' }
    }

    if (start > end) {
      return {
        ok: false,
        message: 'Next period start date must be on or before end date.'
      }
    }

    // Typical rule: next start should be day after current end
    const expectedStart = addDays(currentEnd, 1)
    const expectedStartYMD = toYMD(expectedStart)

    if (nextStartDate !== expectedStartYMD) {
      return {
        ok: true,
        message: `Note: typically the next period starts ${formatGB(expectedStart)} (day after current end).`
      }
    }

    return { ok: true, message: '' }
  }, [nextStartDate, nextEndDate, nextPeriodName, currentEnd])

  function handleConfirm(force = false) {
    startTransition(async () => {
      const res = await closeAccountingPeriodAction({
        clientId,
        periodId: period.id,
        nextPeriod: {
          periodName: nextPeriodName.trim(),
          startDate: nextStartDate,
          endDate: nextEndDate
        },
        force
      })

      if (!res.success) {
        // ✅ narrow: only the override variant has needsOverride/completion
        if ('needsOverride' in res && res.needsOverride) {
          setOverride({
            completed: res.completion.completed,
            total: res.completion.total
          })
          return
        }

        toast.error(res.error ?? 'Failed to close period')
        return
      }

      toast.success(`Closed period. Posted ${res.assetsPosted} assets.`)

      router.push(
        `/organisation/clients/${clientId}/accounting-periods/${res.nextPeriodId}/planning`
      )
      router.refresh()
    })
  }

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/40'>
      <div className='w-[540px] space-y-4 rounded-lg bg-white p-6'>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold'>Close Accounting Period</h2>
          <p className='text-sm text-gray-700'>
            This will permanently close <strong>{period.periodName}</strong>.
          </p>
          <p className='text-sm text-red-600'>
            You will not be able to post depreciation or make changes.
          </p>
        </div>

        <div className='rounded-md border bg-gray-50 p-4'>
          <div className='mb-2 text-sm font-semibold text-gray-900'>
            Next period to create
          </div>

          <div className='grid grid-cols-1 gap-3'>
            <label className='space-y-1'>
              <div className='flex items-center justify-between'>
                <div className='text-xs font-medium text-gray-700'>
                  Period name
                </div>

                {isCustomName && (
                  <button
                    type='button'
                    onClick={resetToDefaultName}
                    disabled={isPending}
                    className='text-xs font-medium text-blue-600 hover:underline disabled:opacity-50'
                  >
                    Reset to default name
                  </button>
                )}
              </div>

              <input
                className='w-full rounded border bg-white px-3 py-2 text-sm'
                value={nextPeriodName}
                onChange={e => {
                  setNextPeriodName(e.target.value)
                  setIsCustomName(true)
                  clearOverride()
                }}
                placeholder={defaultName}
                disabled={isPending}
              />

              <div className='text-[11px] text-gray-600'>
                Default: {defaultName}
              </div>
            </label>

            <div className='grid grid-cols-2 gap-3'>
              <label className='space-y-1'>
                <div className='text-xs font-medium text-gray-700'>
                  Start date
                </div>
                <input
                  type='date'
                  className='w-full rounded border bg-white px-3 py-2 text-sm'
                  value={nextStartDate}
                  onChange={e => {
                    const value = e.target.value
                    setNextStartDate(value)
                    clearOverride()

                    if (!isCustomName) {
                      setNextPeriodName(
                        autoPeriodNameFromStartEndYMD(value, nextEndDate)
                      )
                    }
                  }}
                  disabled={isPending}
                />
                <div className='text-[11px] text-gray-600'>
                  Current period ends {currentEndGB}
                </div>
              </label>

              <label className='space-y-1'>
                <div className='text-xs font-medium text-gray-700'>
                  End date
                </div>
                <input
                  type='date'
                  className='w-full rounded border bg-white px-3 py-2 text-sm'
                  value={nextEndDate}
                  onChange={e => {
                    const value = e.target.value
                    setNextEndDate(value)
                    clearOverride()

                    if (!isCustomName) {
                      setNextPeriodName(
                        autoPeriodNameFromStartEndYMD(nextStartDate, value)
                      )
                    }
                  }}
                  disabled={isPending}
                />
                <div className='text-[11px] text-gray-600'>
                  Span (UK):{' '}
                  {nextStartDate && nextEndDate
                    ? `${formatGB(new Date(nextStartDate))} – ${formatGB(new Date(nextEndDate))}`
                    : '—'}
                </div>
              </label>
            </div>

            {validation.message ? (
              <div
                className={`text-xs ${
                  validation.ok ? 'text-gray-600' : 'text-red-600'
                }`}
              >
                {validation.message}
              </div>
            ) : null}
          </div>
        </div>

        {override && (
          <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900'>
            <div className='font-medium'>Planning pack is incomplete</div>
            <div className='mt-1 text-xs'>
              Only {override.completed} of {override.total} planning sections
              are marked complete.
            </div>
            <div className='mt-2 text-xs text-amber-800'>
              You can still close the period if you want to proceed anyway.
            </div>
          </div>
        )}

        <div className='flex justify-end gap-2 pt-2'>
          <button
            onClick={() => {
              clearOverride()
              onClose()
            }}
            disabled={isPending}
            className='rounded border px-4 py-2 text-sm'
          >
            Cancel
          </button>

          <button
            className='rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60'
            onClick={() => handleConfirm(override != null)}
            disabled={isPending || !validation.ok}
          >
            {isPending
              ? 'Closing…'
              : override
                ? 'Close anyway'
                : 'Close Period'}
          </button>
        </div>
      </div>
    </div>
  )
}
