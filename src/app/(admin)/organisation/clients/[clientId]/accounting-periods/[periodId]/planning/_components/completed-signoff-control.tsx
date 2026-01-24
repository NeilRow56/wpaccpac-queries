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
  completedAt: Date | null
  completedByMemberId: string | null

  // Default memberId to preselect (from Period Setup assignments)
  defaultCompletedById: string | null

  // Compact mode for index rows: show ✓/— with tooltip details
  compact?: boolean
}

export default function CompletedSignoffControl({
  clientId,
  periodId,
  code,
  completedAt,
  completedByMemberId,
  defaultCompletedById,
  compact
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

  const isCompleted = Boolean(completedAt && completedByMemberId)

  const [selectedMemberId, setSelectedMemberId] = React.useState<string>(
    defaultCompletedById ?? ''
  )

  // If defaults change (or members load late), keep the selection sensible when opening.
  React.useEffect(() => {
    if (!open) return
    if (isCompleted) return
    if (!selectedMemberId && defaultCompletedById) {
      setSelectedMemberId(defaultCompletedById)
    }
  }, [open, isCompleted, selectedMemberId, defaultCompletedById])

  const currentInitials =
    completedByMemberId && memberNameById.get(completedByMemberId)
      ? nameToInitials(memberNameById.get(completedByMemberId)!)
      : completedByMemberId
        ? '✓'
        : ''

  const detailedDisplay =
    isCompleted && completedAt
      ? `${currentInitials} · ${formatShortDate(completedAt)}`
      : '—'

  const compactDisplay = isCompleted ? '✓' : 'x'

  // ✅ Always show full label; compact only changes the value display
  const label = 'Completed'

  const tooltip =
    isCompleted && completedAt
      ? `Completed ${detailedDisplay}`
      : 'Not completed'

  async function clearCompleted(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (saving) return

    setSaving(true)
    try {
      const res = await toggleDocSignoffAction({
        clientId,
        periodId,
        code,
        kind: 'COMPLETED',
        checked: false,
        memberId: null
      })
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success('Completion cleared')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function confirmCompleted(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (saving) return

    if (!selectedMemberId) {
      toast.error('Select who completed this')
      return
    }

    setSaving(true)
    try {
      const res = await toggleDocSignoffAction({
        clientId,
        periodId,
        code,
        kind: 'COMPLETED',
        checked: true,
        memberId: selectedMemberId
      })
      if (!res.success) {
        toast.error(res.message)
        return
      }
      toast.success('Marked as completed')
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (isCompleted) {
    return (
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='h-7 px-2 text-xs whitespace-nowrap'
        onClick={clearCompleted}
        disabled={saving}
        title={compact ? tooltip : 'Click to clear completion'}
      >
        <span
          className={
            compact ? 'mr-1 font-medium' : 'mr-1 font-medium text-blue-600'
          }
        >
          {label}
        </span>

        <span className='text-primary tabular-nums'>
          {compact ? compactDisplay : detailedDisplay}
        </span>
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant={compact ? 'ghost' : 'outline'}
          size='sm'
          className='h-7 px-2 text-xs whitespace-nowrap'
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          }}
          disabled={saving}
          title={compact ? tooltip : 'Mark as completed'}
        >
          <span
            className={
              compact ? 'mr-1 font-medium' : 'text-primary mr-1 font-bold'
            }
          >
            {label}
          </span>
          <span className='tabular-nums'>
            {compact ? compactDisplay : detailedDisplay}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align='end'
        className='w-64'
        onOpenAutoFocus={e => e.preventDefault()}
        onClick={e => e.stopPropagation()}
      >
        <div className='space-y-3 text-sm'>
          <div className='font-medium'>Mark as completed</div>

          <div className='space-y-1'>
            <div className='text-muted-foreground text-xs'>Completed by</div>
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
              onClick={confirmCompleted}
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
