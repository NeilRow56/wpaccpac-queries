'use client'

import * as React from 'react'
import type { SignoffEvent } from '@/db/schema/planningDocSignoffs'
import { cn } from '@/lib/utils'

type Props = {
  events: SignoffEvent[]
  memberNameById: Map<string, string>
  className?: string
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function describeEvent(e: SignoffEvent): {
  label: string
  tone: 'set' | 'cleared'
  memberId: string | null
} {
  switch (e.type) {
    case 'REVIEWED_SET':
      return { label: 'Reviewed', tone: 'set', memberId: e.memberId }
    case 'REVIEWED_CLEARED':
      return { label: 'Review cleared', tone: 'cleared', memberId: e.memberId }
    case 'COMPLETED_SET':
      return { label: 'Completed', tone: 'set', memberId: e.memberId }
    case 'COMPLETED_CLEARED':
      return {
        label: 'Completion cleared',
        tone: 'cleared',
        memberId: e.memberId
      }
    default: {
      // Exhaustiveness fallback (should never happen)
      return { label: 'Updated', tone: 'set', memberId: null }
    }
  }
}

export default function SignoffHistoryList({
  events,
  memberNameById,
  className
}: Props) {
  const items = React.useMemo(() => {
    // latest first (assumes append-only in DB; still safe to sort)
    return [...events].sort((a, b) => {
      const atA = 'at' in a ? Date.parse(a.at) : 0
      const atB = 'at' in b ? Date.parse(b.at) : 0
      return atB - atA
    })
  }, [events])

  if (items.length === 0) {
    return (
      <div className={cn('text-muted-foreground text-xs', className)}>
        No signoff history yet.
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((e, idx) => {
        const meta = describeEvent(e)
        const who =
          meta.memberId && memberNameById.get(meta.memberId)
            ? memberNameById.get(meta.memberId)!
            : meta.memberId
              ? 'Unknown member'
              : '—'

        return (
          <div key={`${e.type}-${e.at}-${idx}`} className='flex gap-3 text-xs'>
            <div className='text-muted-foreground w-[140px] shrink-0 tabular-nums'>
              {formatWhen(e.at)}
            </div>

            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[11px] font-medium',
                    meta.tone === 'set'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {meta.label}
                </span>
                <span className='truncate'>{who}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
