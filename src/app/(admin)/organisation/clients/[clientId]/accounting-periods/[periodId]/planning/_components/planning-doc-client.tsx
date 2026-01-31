'use client'

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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

/* -----------------------------
 * Types
 * ----------------------------- */

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
  /**
   * Optional JSON payload for special TEXT docs (e.g. B41 generated schedule)
   */
  initialContentJson?: unknown | null
}

type ChecklistProps = BaseProps & {
  type: 'CHECKLIST'
  defaultChecklist: { id: string; text: string }[]
  initialChecklist: ChecklistDoc | null
}

type Props = TextProps | ChecklistProps | RichTextProps

type HeaderProps = {
  isComplete: boolean
  setIsComplete: (v: boolean) => void
  saving: boolean
  onSave?: () => void
  onReset?: () => void
}

const EMPTY_RICH_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }]
}

/* -----------------------------
 * B41 generated doc (stored in planningDocs.contentJson)
 * ----------------------------- */

type MaterialityDocV1 = {
  kind: 'MATERIALITY'
  version: 1
  generatedMarkdown: string
  generatedAt: string // ISO
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function normalizeMaterialityDoc(raw: unknown): MaterialityDocV1 | null {
  if (!isRecord(raw)) return null
  if (raw.kind !== 'MATERIALITY' || raw.version !== 1) return null

  const generatedMarkdown =
    typeof raw.generatedMarkdown === 'string' ? raw.generatedMarkdown : null
  const generatedAt =
    typeof raw.generatedAt === 'string' ? raw.generatedAt : null

  if (!generatedMarkdown || !generatedAt) return null

  return { kind: 'MATERIALITY', version: 1, generatedMarkdown, generatedAt }
}

/* -----------------------------
 * Component
 * ----------------------------- */

export default function PlanningDocClient(props: Props) {
  const { clientId, periodId, code, initialComplete, updatedAt } = props

  const [isComplete, setIsComplete] = React.useState(initialComplete)
  const [saving, setSaving] = React.useState(false)

  /* ---------- TEXT / NOTES ---------- */

  const [content, setContent] = React.useState(() => {
    if (props.type === 'TEXT' || props.type === 'NOTES') {
      return props.initialContent || props.defaultText
    }
    return ''
  })

  /* ---------- CHECKLIST ---------- */

  const [checklistDoc, setChecklistDoc] = React.useState<ChecklistDoc>(() => {
    if (props.type === 'CHECKLIST') {
      return (
        props.initialChecklist ??
        buildChecklistDocFromDefaults(props.defaultChecklist)
      )
    }
    return { kind: 'CHECKLIST', rows: [] }
  })

  /* ---------- RICH TEXT ---------- */

  const [richJson, setRichJson] = React.useState<JSONContent>(() => {
    if (props.type === 'RICH_TEXT') {
      return (
        props.initialContentJson ?? props.defaultContentJson ?? EMPTY_RICH_DOC
      )
    }
    return EMPTY_RICH_DOC
  })

  const [richSyncKey, setRichSyncKey] = React.useState(1)

  /* -----------------------------
   * Save helpers
   * ----------------------------- */

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
    } finally {
      setSaving(false)
    }
  }

  async function saveChecklist() {
    if (props.type !== 'CHECKLIST' || saving) return
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
    } finally {
      setSaving(false)
    }
  }

  async function saveRichText() {
    if (props.type !== 'RICH_TEXT' || saving) return
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
    } finally {
      setSaving(false)
    }
  }

  /* -----------------------------
   * CHECKLIST
   * ----------------------------- */

  if (props.type === 'CHECKLIST') {
    return (
      <div className='space-y-4'>
        <Header
          isComplete={isComplete}
          setIsComplete={setIsComplete}
          saving={saving}
          onReset={async () => {
            if (saving) return
            try {
              setSaving(true)
              const res = await resetPlanningDocToTemplateAction({
                clientId,
                periodId,
                code
              })
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
          onSave={saveChecklist}
        />

        <ChecklistEditor value={checklistDoc} onChange={setChecklistDoc} />

        <Footer updatedAt={updatedAt} />
      </div>
    )
  }

  /* -----------------------------
   * RICH TEXT
   * ----------------------------- */

  if (props.type === 'RICH_TEXT') {
    const template = props.defaultContentJson ?? EMPTY_RICH_DOC

    return (
      <div className='space-y-4'>
        <Header
          isComplete={isComplete}
          setIsComplete={setIsComplete}
          saving={saving}
          onReset={async () => {
            if (saving) return
            try {
              setSaving(true)
              const res = await resetPlanningDocToTemplateAction({
                clientId,
                periodId,
                code
              })
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
          onSave={saveRichText}
        />

        <RichTextEditor
          value={richJson}
          onChange={setRichJson}
          syncKey={richSyncKey}
        />

        <Footer updatedAt={updatedAt} />
      </div>
    )
  }

  /* -----------------------------
   * TEXT / NOTES (B41 lives here)
   * ----------------------------- */

  const defaultText = props.defaultText ?? ''

  // B41 should open in Preview by default
  const defaultTab = code === 'B41' ? 'preview' : 'edit'

  const materiality =
    code === 'B41' ? normalizeMaterialityDoc(props.initialContentJson) : null

  return (
    <div className='space-y-4'>
      <Header
        isComplete={isComplete}
        setIsComplete={setIsComplete}
        saving={saving}
        onSave={saveTextDoc}
        onReset={async () => {
          if (saving) return
          try {
            setSaving(true)
            const res = await resetPlanningDocToTemplateAction({
              clientId,
              periodId,
              code
            })
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
      />

      {/* ✅ B41: show generated schedule (read-only) above notes */}
      {code === 'B41' && materiality && (
        <div className='rounded-md border bg-gray-50 p-4'>
          <div className='mb-2 flex items-baseline justify-between gap-3'>
            <div className='text-sm font-semibold text-gray-900'>
              Generated schedule
            </div>
            <div className='text-muted-foreground text-xs'>
              Generated {new Date(materiality.generatedAt).toLocaleString()}
            </div>
          </div>

          <div className='prose prose-sm prose-h1:text-lg prose-h1:font-semibold prose-h1:border-b prose-h1:pb-2 prose-table:w-full prose-table:table-fixed prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:whitespace-nowrap prose-td:px-3 prose-td:py-2 prose-td:align-top max-w-none rounded-md border bg-white p-4'>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {materiality.generatedMarkdown}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value='edit'>
            {code === 'B41' ? 'Edit notes' : 'Edit'}
          </TabsTrigger>
          <TabsTrigger value='preview'>
            {code === 'B41' ? 'Preview notes' : 'Preview'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='edit' className='mt-3'>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={code === 'B41' ? 10 : 18}
            className='font-mono'
            placeholder={
              code === 'B41' ? 'Add notes / rationale…' : 'Write in Markdown…'
            }
          />
        </TabsContent>

        <TabsContent value='preview' className='mt-3'>
          <div className='prose prose-sm prose-h1:text-lg prose-h1:font-semibold prose-h1:border-b prose-h1:pb-2 prose-table:w-full prose-table:table-fixed prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:px-3 prose-td:py-2 prose-td:align-top max-w-none rounded-md border p-4'>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || defaultText || ''}
            </ReactMarkdown>
          </div>
        </TabsContent>
      </Tabs>

      <Footer updatedAt={updatedAt} />
    </div>
  )
}

/* -----------------------------
 * Small helpers
 * ----------------------------- */

function Header({
  isComplete,
  setIsComplete,
  saving,
  onSave,
  onReset
}: HeaderProps) {
  return (
    <div className='flex items-center gap-3'>
      <Checkbox
        checked={isComplete}
        onCheckedChange={v => setIsComplete(v === true)}
      />
      <span className='text-sm'>Mark document as complete</span>

      <div className='ml-auto flex gap-2'>
        {onReset && (
          <Button
            type='button'
            variant='outline'
            disabled={saving}
            onClick={onReset}
          >
            Reset to template
          </Button>
        )}

        {onSave && (
          <Button type='button' disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>
    </div>
  )
}

function Footer({ updatedAt }: { updatedAt: string | null }) {
  return (
    <div className='text-muted-foreground text-xs'>
      {updatedAt
        ? `Last updated: ${new Date(updatedAt).toLocaleString()}`
        : 'Not yet saved'}
    </div>
  )
}
