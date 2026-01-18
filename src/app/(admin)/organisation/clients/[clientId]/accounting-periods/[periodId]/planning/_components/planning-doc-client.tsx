'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { upsertPlanningDocAction } from '@/server-actions/planning-docs'
import ChecklistEditor from './checklist-editor'
import type { ChecklistDoc } from '@/lib/planning/checklist-types'
import { buildChecklistDocFromDefaults } from '@/lib/planning/checklist-types'

type BaseProps = {
  clientId: string
  periodId: string
  code: string
  initialComplete: boolean
  updatedAt: string | null
}

type TextProps = BaseProps & {
  type: 'TEXT' | 'NOTES'
  defaultText: string
  initialContent: string
}

type ChecklistProps = BaseProps & {
  type: 'CHECKLIST'
  defaultChecklist: { id: string; text: string }[]
  initialChecklist: ChecklistDoc | null
}

type Props = TextProps | ChecklistProps

export default function PlanningDocClient(props: Props) {
  const { clientId, periodId, code, initialComplete, updatedAt } = props

  // ✅ hooks must be unconditional
  const [isComplete, setIsComplete] = React.useState(initialComplete)
  const [saving, setSaving] = React.useState(false)

  const [content, setContent] = React.useState(() => {
    if (props.type === 'TEXT' || props.type === 'NOTES') {
      return props.initialContent || props.defaultText
    }
    return ''
  })

  const [checklistDoc, setChecklistDoc] = React.useState<ChecklistDoc>(() => {
    if (props.type === 'CHECKLIST') {
      return (
        props.initialChecklist ??
        buildChecklistDocFromDefaults(props.defaultChecklist)
      )
    }
    // never used for text docs, but must exist to keep hook order stable
    return { kind: 'CHECKLIST', rows: [] }
  })

  async function saveTextDoc() {
    if (saving) return
    try {
      setSaving(true)
      const res = await upsertPlanningDocAction({
        clientId,
        periodId,
        code,
        content,
        isComplete
      })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to save')
        return
      }
      toast.success('Saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function saveChecklist() {
    if (props.type !== 'CHECKLIST') return
    if (saving) return
    try {
      setSaving(true)
      const res = await upsertPlanningDocAction({
        clientId,
        periodId,
        code,
        contentJson: checklistDoc,
        isComplete
      })
      if (!res.success) {
        toast.error(res.error ?? 'Failed to save')
        return
      }
      toast.success('Saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // CHECKLIST branch
  if (props.type === 'CHECKLIST') {
    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-3'>
          <Checkbox
            id='doc-complete'
            checked={isComplete}
            onCheckedChange={v => setIsComplete(v === true)}
          />
          <label htmlFor='doc-complete' className='text-sm'>
            Mark document as complete
          </label>

          <div className='ml-auto flex items-center gap-2'>
            <Button type='button' onClick={saveChecklist} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <ChecklistEditor value={checklistDoc} onChange={setChecklistDoc} />

        <div className='text-muted-foreground text-xs'>
          {updatedAt
            ? `Last updated: ${new Date(updatedAt).toLocaleString()}`
            : 'Not yet saved'}
        </div>
      </div>
    )
  }

  // TEXT / NOTES branch
  const defaultText = props.defaultText ?? ''

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <Checkbox
          id='doc-complete'
          checked={isComplete}
          onCheckedChange={v => setIsComplete(v === true)}
        />
        <label htmlFor='doc-complete' className='text-sm'>
          Mark document as complete
        </label>

        <div className='ml-auto flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setContent(defaultText)}
            disabled={saving}
          >
            Reset to template
          </Button>

          <Button type='button' onClick={saveTextDoc} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue='edit' className='w-full'>
        <TabsList>
          <TabsTrigger value='edit'>Edit</TabsTrigger>
          <TabsTrigger value='preview'>Preview</TabsTrigger>
        </TabsList>

        <TabsContent value='edit' className='mt-3'>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={18}
            className='font-mono'
            placeholder='Write in Markdown…'
          />
          <p className='text-muted-foreground mt-2 text-xs'>
            Markdown supported (e.g.{' '}
            <span className='font-mono'>## Heading</span>,{' '}
            <span className='font-mono'>- bullet</span>).
          </p>
        </TabsContent>

        <TabsContent value='preview' className='mt-3'>
          <div className='prose prose-sm max-w-none rounded-md border p-4'>
            <ReactMarkdown>{content || defaultText || ''}</ReactMarkdown>
          </div>
        </TabsContent>
      </Tabs>

      <div className='text-muted-foreground text-xs'>
        {updatedAt
          ? `Last updated: ${new Date(updatedAt).toLocaleString()}`
          : 'Not yet saved'}
      </div>
    </div>
  )
}
