import { notFound } from 'next/navigation'
import { B_DOCS } from '@/planning/registry'
import { getPlanningDoc } from '@/server-actions/planning-docs'
import PlanningDocClient from '../_components/planning-doc-client'

import type { ChecklistDoc } from '@/lib/planning/checklist-types'
import { buildChecklistDocFromDefaults } from '@/lib/planning/checklist-types'
import type { JSONContent } from '@tiptap/core'

function isChecklistDocJson(v: unknown): v is ChecklistDoc {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  return obj.kind === 'CHECKLIST' && Array.isArray(obj.rows)
}

function isNonEmptyTipTapDoc(v: unknown): v is JSONContent {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  if (obj.type !== 'doc') return false
  if (!('content' in obj)) return false

  const content = obj.content
  if (!Array.isArray(content)) return false
  if (content.length === 0) return false

  // Treat a single empty paragraph as "empty"
  if (content.length === 1) {
    const first = content[0]
    if (first && typeof first === 'object') {
      const node = first as Record<string, unknown>
      if (node.type === 'paragraph') {
        const inner = node.content
        if (!Array.isArray(inner) || inner.length === 0) return false
      }
    }
  }

  return true
}

export default async function PlanningDocPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string; docCode: string }>
}) {
  const { clientId, periodId, docCode } = await params
  const code = decodeURIComponent(docCode)

  const docDef = B_DOCS.find(d => d.code === code)
  if (!docDef) notFound()

  const existing = await getPlanningDoc({ clientId, periodId, code })

  const updatedAtIso = existing?.updatedAt
    ? new Date(existing.updatedAt).toISOString()
    : null

  // ----------------------------
  // CHECKLIST lazy defaults
  // ----------------------------
  const savedChecklist =
    docDef.type === 'CHECKLIST' && isChecklistDocJson(existing?.contentJson)
      ? (existing.contentJson as ChecklistDoc)
      : null

  const initialChecklist =
    docDef.type === 'CHECKLIST'
      ? (savedChecklist ??
        buildChecklistDocFromDefaults(docDef.defaultChecklist))
      : null

  // ----------------------------
  // RICH_TEXT lazy defaults
  // ----------------------------
  const initialRichTextJson: JSONContent | null =
    docDef.type === 'RICH_TEXT'
      ? isNonEmptyTipTapDoc(existing?.contentJson)
        ? (existing!.contentJson as JSONContent)
        : docDef.defaultContentJson
      : null

  return (
    <div className='space-y-4'>
      <h1 className='text-xl font-semibold'>
        {docDef.code} — {docDef.title}
      </h1>

      {docDef.type === 'CHECKLIST' ? (
        <PlanningDocClient
          clientId={clientId}
          periodId={periodId}
          code={docDef.code}
          type='CHECKLIST'
          defaultChecklist={docDef.defaultChecklist}
          initialChecklist={initialChecklist}
          initialComplete={existing?.isComplete ?? false}
          updatedAt={updatedAtIso}
        />
      ) : docDef.type === 'RICH_TEXT' ? (
        <PlanningDocClient
          clientId={clientId}
          periodId={periodId}
          code={docDef.code}
          type='RICH_TEXT'
          defaultContentJson={docDef.defaultContentJson}
          initialContentJson={initialRichTextJson}
          initialComplete={existing?.isComplete ?? false}
          updatedAt={updatedAtIso}
        />
      ) : (
        // TEXT / NOTES
        <PlanningDocClient
          clientId={clientId}
          periodId={periodId}
          code={docDef.code}
          type={docDef.type}
          defaultText={docDef.defaultText ?? ''}
          initialContent={existing?.content ?? ''}
          initialComplete={existing?.isComplete ?? false}
          updatedAt={updatedAtIso}
        />
      )}
    </div>
  )
}
