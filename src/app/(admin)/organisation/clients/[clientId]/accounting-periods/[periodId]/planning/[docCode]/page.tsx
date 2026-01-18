import { notFound } from 'next/navigation'
import { B_DOCS } from '@/planning/registry'
import { getPlanningDoc } from '@/server-actions/planning-docs'
import PlanningDocClient from '../_components/planning-doc-client'
import type { ChecklistDoc } from '@/lib/planning/checklist-types'
import { buildChecklistDocFromDefaults } from '@/lib/planning/checklist-types'

function isChecklistDocJson(v: unknown): v is ChecklistDoc {
  if (!v || typeof v !== 'object') return false
  const obj = v as Record<string, unknown>
  return obj.kind === 'CHECKLIST' && Array.isArray(obj.rows)
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

  const savedChecklist =
    docDef.type === 'CHECKLIST' && isChecklistDocJson(existing?.contentJson)
      ? (existing?.contentJson as ChecklistDoc)
      : null

  const initialChecklist =
    docDef.type === 'CHECKLIST'
      ? (savedChecklist ??
        buildChecklistDocFromDefaults(docDef.defaultChecklist))
      : null

  const updatedAtIso = existing?.updatedAt
    ? new Date(existing.updatedAt).toISOString()
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
          type={docDef.type}
          defaultChecklist={docDef.defaultChecklist}
          initialChecklist={initialChecklist}
          initialComplete={existing?.isComplete ?? false}
          updatedAt={updatedAtIso}
        />
      ) : (
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
