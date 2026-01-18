import { notFound } from 'next/navigation'
import { B_DOCS } from '@/planning/registry'
import { getPlanningDoc } from '@/server-actions/planning-docs'
import PlanningDocClient from '../_components/planning-doc-client'

export default async function PlanningDocPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string; docCode: string }>
}) {
  const { clientId, periodId, docCode } = await params

  // Decode URL-safe codes like B14-2(a)
  const code = decodeURIComponent(docCode)

  // 1️⃣ Find registry definition
  const docDef = B_DOCS.find(d => d.code === code)
  if (!docDef) notFound()

  // 2️⃣ Load existing DB content (if any)
  const existing = await getPlanningDoc({
    clientId,
    periodId,
    code
  })

  return (
    <div className='space-y-4'>
      <h1 className='text-xl font-semibold'>
        {docDef.code} — {docDef.title}
      </h1>

      <PlanningDocClient
        clientId={clientId}
        periodId={periodId}
        code={docDef.code}
        type={docDef.type}
        defaultText={docDef.defaultText ?? ''}
        initialContent={existing?.content ?? ''}
        initialComplete={existing?.isComplete ?? false}
        updatedAt={existing?.updatedAt ?? null}
      />
    </div>
  )
}
