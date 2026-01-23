'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { toggleDocSignoffAction } from '@/server-actions/doc-signoff'
import { authClient } from '@/lib/auth-client'

function nameToInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts.at(-1)![0]!).toUpperCase()
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

type Props = {
  clientId: string
  periodId: string
  code: string

  // Current state (from DB)
  reviewedAt: Date | null
  reviewedByMemberId: string | null

  // Default memberId to preselect (from Period Setup assignments)
  defaultReviewerId: string | null
}

export default function ReviewedSignoffControl({
  clientId,
  periodId,
  code,
  reviewedAt,
  reviewedByMemberId,
  defaultReviewerId
}: Props) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const { data: activeOrganization } = authClient.useActiveOrganization()

  const members = React.useMemo(() => {
    const orgMembers = activeOrganization?.members ?? []
    return orgMembers
      .filter(m => m.user?.name)
      .map(m => ({
        memberId: m.id,
        name: m.user!.name
      }))
  }, [activeOrganization?.members])

  const memberNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.memberId, m.name)
    return map
  }, [members])

  const isReviewed = Boolean(reviewedAt && reviewedByMemberId)

  const [selectedMemberId, setSelectedMemberId] = React.useState<string>(
    defaultReviewerId ?? ''
  )

  // If defaults change (or members load late), keep the selection sensible when opening.
  React.useEffect(() => {
    if (!open) return
    if (isReviewed) return
    if (!selectedMemberId && defaultReviewerId)
      setSelectedMemberId(defaultReviewerId)
  }, [open, isReviewed, selectedMemberId, defaultReviewerId])

  const currentInitials =
    reviewedByMemberId && memberNameById.get(reviewedByMemberId)
      ? nameToInitials(memberNameById.get(reviewedByMemberId)!)
      : reviewedByMemberId
        ? '✓'
        : ''

  async function clearReviewed(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (saving) return

    setSaving(true)
    try {
      const res = await toggleDocSignoffAction({
        clientId,
        periodId,
        code,
        kind: 'REVIEWED',
        checked: false,
        memberId: null
      })
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success('Review cleared')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function confirmReviewed(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (saving) return

    if (!selectedMemberId) {
      toast.error('Select a reviewer')
      return
    }

    setSaving(true)
    try {
      const res = await toggleDocSignoffAction({
        clientId,
        periodId,
        code,
        kind: 'REVIEWED',
        checked: true,
        memberId: selectedMemberId
      })
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success('Marked as reviewed')
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  // Display text on the button
  const display =
    isReviewed && reviewedAt
      ? `${currentInitials} · ${formatShortDate(reviewedAt)}`
      : '—'

  if (isReviewed) {
    // When already reviewed, click clears immediately (simple + fast UX)
    return (
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='h-7 px-2 text-xs'
        onClick={clearReviewed}
        disabled={saving}
        title='Click to clear review'
      >
        <span className='mr-1 font-medium'>Rev</span>
        <span className='tabular-nums'>{display}</span>
      </Button>
    )
  }

  // When not reviewed, clicking opens popover to choose reviewer (defaulted)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-7 px-2 text-xs'
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          }}
          disabled={saving}
          title='Mark as reviewed'
        >
          <span className='mr-1 font-medium'>Rev</span>
          <span className='tabular-nums'>{display}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align='end'
        className='w-64'
        onOpenAutoFocus={e => e.preventDefault()}
        onClick={e => e.stopPropagation()}
      >
        <div className='space-y-3 text-sm'>
          <div className='font-medium'>Mark as reviewed</div>

          <div className='space-y-1'>
            <div className='text-muted-foreground text-xs'>Reviewer</div>
            <select
              className='bg-background h-9 w-full rounded-md border px-3 text-sm'
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
            >
              <option value=''>—</option>
              {members.map(m => (
                <option key={m.memberId} value={m.memberId}>
                  {nameToInitials(m.name)} — {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                setOpen(false)
              }}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type='button'
              size='sm'
              onClick={confirmReviewed}
              disabled={saving}
            >
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
