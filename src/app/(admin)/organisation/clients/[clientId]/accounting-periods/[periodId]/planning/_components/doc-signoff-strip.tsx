'use client'

import ReviewedSignoffControl from './reviewed-signoff-control'
import CompletedSignoffControl from './completed-signoff-control'

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
  compact
}: Props) {
  return (
    <div className='flex items-center gap-2'>
      <ReviewedSignoffControl
        clientId={clientId}
        periodId={periodId}
        code={code}
        reviewedAt={reviewedAt}
        reviewedByMemberId={reviewedByMemberId}
        defaultReviewerId={defaultReviewerId}
        compact={compact}
      />

      <CompletedSignoffControl
        clientId={clientId}
        periodId={periodId}
        code={code}
        completedAt={completedAt}
        completedByMemberId={completedByMemberId}
        defaultCompletedById={defaultCompletedById}
        compact={compact}
      />
    </div>
  )
}
