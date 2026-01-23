'use client'

import ReviewedSignoffControl from '../_components/reviewed-signoff-control'

export default function DocSignoffStrip(props: {
  clientId: string
  periodId: string
  code: string
  reviewedAt: Date | null
  reviewedByMemberId: string | null
  defaultReviewerId: string | null
}) {
  return (
    <div className='flex items-center gap-2'>
      <ReviewedSignoffControl {...props} />
      {/* later: add Completed control next to it */}
    </div>
  )
}
