'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { upsertPlanningDocAction } from '@/server-actions/planning-docs'

type Props = {
  clientId: string
  periodId: string
  code: string
  type: 'TEXT' | 'NOTES'
  defaultText: string
  initialContent: string
  initialComplete: boolean
  updatedAt: Date | null
}

export default function PlanningDocClient(props: Props) {
  const {
    clientId,
    periodId,
    code,
    defaultText,
    initialContent,
    initialComplete,
    updatedAt
  } = props

  const [content, setContent] = React.useState(initialContent || defaultText)
  const [isComplete, setIsComplete] = React.useState(initialComplete)
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await upsertPlanningDocAction({
        clientId,
        periodId,
        code,
        content,
        isComplete
      })

      if (!res.success) {
        toast.error(res.error)
        return
      }

      toast.success('Planning document saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-4'>
      <Textarea
        className='min-h-[300px]'
        value={content}
        onChange={e => setContent(e.target.value)}
      />

      <div className='flex items-center justify-between'>
        <label className='flex items-center gap-2 text-sm'>
          <Checkbox
            checked={isComplete}
            onCheckedChange={v => setIsComplete(!!v)}
          />
          Mark as complete
        </label>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {updatedAt && (
        <div className='text-muted-foreground text-xs'>
          Last updated: {updatedAt.toLocaleString('en-GB')}
        </div>
      )}
    </div>
  )
}
