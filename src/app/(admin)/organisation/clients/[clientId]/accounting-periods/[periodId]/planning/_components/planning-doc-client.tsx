'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  resetPlanningDocToTemplateAction,
  upsertPlanningDocAction
} from '@/server-actions/planning-docs'
import ChecklistEditor from './checklist-editor'
import RichTextEditor from './rich-text-editor'

import type { ChecklistDoc } from '@/lib/planning/checklist-types'
import {
  buildChecklistDocFromDefaults,
  isChecklistDocJson
} from '@/lib/planning/checklist-types'
import type { JSONContent } from '@tiptap/core'

type BaseProps = {
  clientId: string
  periodId: string
  code: string
  initialComplete: boolean
  updatedAt: string | null
}

type RichTextProps = BaseProps & {
  type: 'RICH_TEXT'
  defaultContentJson: JSONContent
  initialContentJson: JSONContent | null
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

type Props = TextProps | ChecklistProps | RichTextProps

const EMPTY_RICH_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }]
}

export default function PlanningDocClient(props: Props) {
  const { clientId, periodId, code, initialComplete, updatedAt } = props

  // ✅ hooks must be unconditional
  const [isComplete, setIsComplete] = React.useState(initialComplete)
  const [saving, setSaving] = React.useState(false)

  // TEXT / NOTES state
  const [content, setContent] = React.useState(() => {
    if (props.type === 'TEXT' || props.type === 'NOTES') {
      return props.initialContent || props.defaultText
    }
    return ''
  })

  // CHECKLIST state
  const [checklistDoc, setChecklistDoc] = React.useState<ChecklistDoc>(() => {
    if (props.type === 'CHECKLIST') {
      return (
        props.initialChecklist ??
        buildChecklistDocFromDefaults(props.defaultChecklist)
      )
    }
    // never used for non-checklist docs, but must exist for stable hook order
    return { kind: 'CHECKLIST', rows: [] }
  })

  // RICH_TEXT state
  const [richJson, setRichJson] = React.useState<JSONContent>(() => {
    if (props.type === 'RICH_TEXT') {
      return (
        props.initialContentJson ?? props.defaultContentJson ?? EMPTY_RICH_DOC
      )
    }
    // never used for non-rich docs, but must exist for stable hook order
    return EMPTY_RICH_DOC
  })

  const [richSyncKey, setRichSyncKey] = React.useState(1)

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

  async function saveRichText() {
    if (props.type !== 'RICH_TEXT') return
    if (saving) return
    try {
      setSaving(true)
      const res = await upsertPlanningDocAction({
        clientId,
        periodId,
        code,
        contentJson: richJson,
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

  // ----------------------------
  // CHECKLIST branch
  // ----------------------------
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
            <Button
              type='button'
              variant='outline'
              disabled={saving}
              onClick={async () => {
                if (saving) return
                try {
                  setSaving(true)

                  const res = await resetPlanningDocToTemplateAction({
                    clientId,
                    periodId,
                    code
                  })

                  if (!res.success) {
                    toast.error(res.error ?? 'Failed to reset')
                    return
                  }

                  setChecklistDoc(
                    isChecklistDocJson(res.contentJson)
                      ? res.contentJson
                      : buildChecklistDocFromDefaults(props.defaultChecklist)
                  )

                  setIsComplete(false)

                  toast.success('Reset to template')
                } catch {
                  toast.error('Failed to reset')
                } finally {
                  setSaving(false)
                }
              }}
            >
              Reset to template
            </Button>

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

  // ----------------------------
  // RICH_TEXT branch
  // ----------------------------
  if (props.type === 'RICH_TEXT') {
    const template = props.defaultContentJson ?? EMPTY_RICH_DOC

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
              onClick={async () => {
                if (saving) return
                try {
                  setSaving(true)

                  const res = await resetPlanningDocToTemplateAction({
                    clientId,
                    periodId,
                    code
                  })

                  if (!res.success) {
                    toast.error(res.error ?? 'Failed to reset')
                    return
                  }

                  // Prefer server-returned JSON (canonical), fallback to template
                  const next = (res.contentJson ?? template) as JSONContent
                  setRichJson(next)
                  setRichSyncKey(k => k + 1)
                  setIsComplete(false)

                  toast.success('Reset to template')
                } catch {
                  toast.error('Failed to reset')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              Reset to template
            </Button>

            <Button type='button' onClick={saveRichText} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <RichTextEditor
          value={richJson}
          onChange={setRichJson}
          syncKey={richSyncKey}
        />

        <div className='text-muted-foreground text-xs'>
          {updatedAt
            ? `Last updated: ${new Date(updatedAt).toLocaleString()}`
            : 'Not yet saved'}
        </div>
      </div>
    )
  }

  // ----------------------------
  // TEXT / NOTES branch
  // ----------------------------
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
            onClick={async () => {
              if (saving) return
              try {
                setSaving(true)

                const res = await resetPlanningDocToTemplateAction({
                  clientId,
                  periodId,
                  code
                })

                if (!res.success) {
                  toast.error(res.error ?? 'Failed to reset')
                  return
                }

                setContent(
                  typeof res.content === 'string' ? res.content : defaultText
                )
                setIsComplete(false)

                toast.success('Reset to template')
              } catch {
                toast.error('Failed to reset')
              } finally {
                setSaving(false)
              }
            }}
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
