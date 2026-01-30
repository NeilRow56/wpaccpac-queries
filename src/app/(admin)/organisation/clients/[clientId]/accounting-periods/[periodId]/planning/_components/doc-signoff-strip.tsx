'use client'

import * as React from 'react'

import ReviewedSignoffControl from './reviewed-signoff-control'
import CompletedSignoffControl from './completed-signoff-control'

export type DocSignoffControlCopy = {
  /** Overrides the popover title (e.g. "Confirm final accounts agree to schedules"). */
  popoverTitle?: string
  /** Optional explanatory text shown in the popover, under the title. */
  popoverBody?: React.ReactNode
  /** Overrides the confirm button label (defaults to "Confirm"). */
  confirmCtaLabel?: string
}

export type DocSignoffStripCopy = {
  /**
   * Optional helper text displayed under the strip.
   * Use this to clarify what sign-off means for a particular doc (e.g. A11).
   */
  helperText?: React.ReactNode

  /** Optional copy overrides for the Reviewed sign-off popover. */
  reviewed?: DocSignoffControlCopy

  /** Optional copy overrides for the Completed sign-off popover. */
  completed?: DocSignoffControlCopy
}

type Props = {
  clientId: string
  periodId: string
  code: string

  reviewedAt: Date | null
  reviewedByMemberId: string | null
  defaultReviewerId: string | null

  completedAt: Date | null
  completedByMemberId: string | null
  defaultCompletedById: string | null

  // When true: show compact indicators (Rev ✓ / Comp ✓) for index rows
  compact?: boolean

  /**
   * Optional per-document copy overrides.
   * Safe for existing uses: when omitted, rendering is unchanged.
   */
  copy?: DocSignoffStripCopy
}

export default function DocSignoffStrip({
  clientId,
  periodId,
  code,
  reviewedAt,
  reviewedByMemberId,
  defaultReviewerId,
  completedAt,
  completedByMemberId,
  defaultCompletedById,
  compact,
  copy
}: Props) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <ReviewedSignoffControl
          clientId={clientId}
          periodId={periodId}
          code={code}
          reviewedAt={reviewedAt}
          reviewedByMemberId={reviewedByMemberId}
          defaultReviewerId={defaultReviewerId}
          compact={compact}
          copy={copy?.reviewed}
        />

        <CompletedSignoffControl
          clientId={clientId}
          periodId={periodId}
          code={code}
          completedAt={completedAt}
          completedByMemberId={completedByMemberId}
          defaultCompletedById={defaultCompletedById}
          compact={compact}
          copy={copy?.completed}
        />
      </div>

      {copy?.helperText ? (
        <div className='text-muted-foreground text-xs'>{copy.helperText}</div>
      ) : null}
    </div>
  )
}
