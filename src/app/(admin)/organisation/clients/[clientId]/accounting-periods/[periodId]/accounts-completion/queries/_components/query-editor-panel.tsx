// src/app/organisation/clients/[clientId]/accounting-periods/[periodId]/accounts-completion/queries/_components/query-editor-panel.tsx

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { JSONContent } from '@tiptap/core'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import {
  saveAccountsQueryAction,
  setAccountsQueryStatusAction
} from '@/server-actions/accounts/queries'
import RichTextEditor from '../../../planning/_components/rich-text-editor'

type Status = 'OPEN' | 'ANSWERED' | 'CLEARED'

type Props = {
  clientId: string
  periodId: string
  activeQueryId: string
  initial: {
    query: {
      id: string
      number: number
      title: string | null
      status: Status
      questionJson: unknown
      createdAt: string
      createdByName: string | null
      createdByEmail: string | null
    }
    responses: Array<{
      id: string
      responseJson: unknown
      createdAt: string
      createdByName: string | null
      createdByEmail: string | null
    }>
  }
}

const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }]
}

function asJsonContent(v: unknown): JSONContent {
  if (!v || typeof v !== 'object') return EMPTY_DOC
  return v as JSONContent
}

/**
 * Treat "empty" as doc with no real text content.
 * This prevents inserting blank response rows.
 */
function isNonEmptyDoc(doc: JSONContent): boolean {
  const content = doc?.content
  if (!Array.isArray(content) || content.length === 0) return false

  // Consider doc with only one empty paragraph as empty
  if (content.length === 1) {
    const n0 = content[0] as
      | { type?: unknown; content?: unknown; text?: unknown }
      | undefined
    if (n0 && typeof n0 === 'object' && n0.type === 'paragraph') {
      const inner = (n0 as { content?: unknown }).content
      if (!Array.isArray(inner) || inner.length === 0) return false
      const hasRealText = inner.some(node => {
        if (!node || typeof node !== 'object') return false
        const txt = (node as { text?: unknown }).text
        return typeof txt === 'string' && txt.trim().length > 0
      })
      return hasRealText
    }
  }

  // Otherwise look for any text node with non-whitespace
  const hasText = JSON.stringify(doc).replace(/\s+/g, '').includes('"text":"')
  if (!hasText) return false

  // Additionally avoid the exact EMPTY_DOC or truly empty doc
  const s = JSON.stringify(doc)
  const isExactEmpty =
    s === JSON.stringify(EMPTY_DOC) ||
    s === JSON.stringify({ type: 'doc', content: [] })

  return !isExactEmpty
}

export default function QueryEditorPanel({
  clientId,
  periodId,
  activeQueryId,
  initial
}: Props) {
  const router = useRouter()

  // Used to re-seed the QUESTION editor when switching query
  const questionSyncKey = React.useMemo(() => {
    // stable-ish hash: queryId + createdAt makes it change on navigation
    return Number(
      String(
        Math.abs(
          [...`${activeQueryId}:${initial.query.createdAt}`].reduce(
            (acc, c) => acc + c.charCodeAt(0),
            0
          )
        )
      )
    )
  }, [activeQueryId, initial.query.createdAt])

  const [title, setTitle] = React.useState(initial.query.title ?? '')
  const [status, setStatus] = React.useState<Status>(initial.query.status)

  const [questionDoc, setQuestionDoc] = React.useState<JSONContent>(() =>
    asJsonContent(initial.query.questionJson)
  )

  // Draft answer (append-only)
  const [answerDoc, setAnswerDoc] = React.useState<JSONContent>(EMPTY_DOC)

  // Separate sync key for ANSWER so we can clear it after save without affecting the query editor
  const [answerSyncKey, setAnswerSyncKey] = React.useState(0)

  // When navigating to a different query, reset local state
  React.useEffect(() => {
    setTitle(initial.query.title ?? '')
    setStatus(initial.query.status)
    setQuestionDoc(asJsonContent(initial.query.questionJson))

    // Always clear the draft answer when you switch query
    setAnswerDoc(EMPTY_DOC)
    setAnswerSyncKey(k => k + 1)
  }, [questionSyncKey, initial])

  const revalidate = `/organisation/clients/${clientId}/accounting-periods/${periodId}/accounts-completion/queries/${activeQueryId}`

  async function onSave() {
    const responseJson = isNonEmptyDoc(answerDoc) ? answerDoc : undefined

    const res = await saveAccountsQueryAction({
      queryId: activeQueryId,
      title: title.trim() ? title.trim() : null,
      status,
      questionJson: questionDoc,
      ...(responseJson ? { responseJson } : {}),
      revalidatePath: revalidate
    })

    if (res.success) {
      toast.success('Saved')

      // ✅ Clear the answer editor after save so users don't think it's editable history
      setAnswerDoc(EMPTY_DOC)
      setAnswerSyncKey(k => k + 1)

      router.refresh()
      return
    }

    toast.error(res.message ?? 'Failed to save')
  }

  async function onSetStatus(next: Status) {
    setStatus(next)

    const res = await setAccountsQueryStatusAction({
      queryId: activeQueryId,
      status: next,
      revalidatePath: revalidate
    })

    if (!res.success) toast.error(res.message ?? 'Failed to set status')
    else router.refresh()
  }

  return (
    <div className='space-y-5'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-medium'>Q{initial.query.number}</div>
          <div className='text-muted-foreground text-xs'>
            Created{' '}
            {new Date(initial.query.createdAt).toLocaleDateString('en-GB')} by{' '}
            {initial.query.createdByName ?? initial.query.createdByEmail ?? '—'}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {/* Keep local state in sync with dropdown changes */}
          <Select value={status} onValueChange={v => setStatus(v as Status)}>
            <SelectTrigger className='h-9 w-35'>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='OPEN'>OPEN</SelectItem>
              <SelectItem value='ANSWERED'>ANSWERED</SelectItem>
              <SelectItem value='CLEARED'>CLEARED</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onSetStatus('CLEARED')}
          >
            Mark cleared
          </Button>
        </div>
      </div>

      <div className='space-y-2'>
        <div className='text-sm font-medium'>Title</div>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder='Short title for the query'
        />
      </div>

      {/* Two-column editor layout */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <div className='space-y-2'>
          <div className='text-sm font-medium'>Query</div>
          <RichTextEditor
            value={questionDoc}
            onChange={setQuestionDoc}
            placeholder='Type the query…'
            syncKey={questionSyncKey}
          />
        </div>

        <div className='space-y-2'>
          <div className='text-sm font-medium'>New answer</div>
          <RichTextEditor
            value={answerDoc}
            onChange={setAnswerDoc}
            placeholder='Type the answer…'
            // ✅ driven by answerSyncKey so we can clear after save
            syncKey={answerSyncKey}
          />
          <div className='text-muted-foreground text-xs'>
            Saving appends the answer as a new response entry (with your member
            attribution).
          </div>
        </div>
      </div>

      <div className='flex items-center justify-end gap-2 border-t pt-3'>
        <Button type='button' onClick={onSave}>
          Save
        </Button>
      </div>

      {/* History */}
      <div className='space-y-2 border-t pt-4'>
        <div className='text-sm font-medium'>History</div>

        {initial.responses.length === 0 ? (
          <div className='text-muted-foreground text-sm'>No responses yet.</div>
        ) : (
          <div className='space-y-3'>
            {initial.responses.map((r, idx) => (
              <div key={r.id} className='rounded-md border p-3'>
                <div className='text-muted-foreground mb-2 text-xs'>
                  {new Date(r.createdAt).toLocaleString('en-GB')} —{' '}
                  {r.createdByName ?? r.createdByEmail ?? '—'}
                </div>

                <RichTextEditor
                  value={asJsonContent(r.responseJson)}
                  onChange={() => {}}
                  readOnly
                  // keep history stable per query
                  syncKey={questionSyncKey + 1000 + idx}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
