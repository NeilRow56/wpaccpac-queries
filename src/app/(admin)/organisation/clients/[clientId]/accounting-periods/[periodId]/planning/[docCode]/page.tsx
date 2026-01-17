import Link from 'next/link'

export default async function PlanningDocPage({
  params
}: {
  params: Promise<{ clientId: string; periodId: string; docCode: string }>
}) {
  const { clientId, periodId, docCode } = await params

  // docCode is URL-encoded because codes include characters like "(" and ")"
  const decodedCode = decodeURIComponent(docCode)

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-xl font-bold'>{decodedCode}</h1>
          <p className='text-muted-foreground text-sm'>
            Planning document editor (textarea coming next)
          </p>
        </div>

        <Link
          className='text-sm underline'
          href={`/organisation/clients/${clientId}/accounting-periods/${periodId}/planning`}
        >
          Back to Planning index
        </Link>
      </div>

      <div className='rounded-md border p-4 text-sm'>
        Route OK. docCode param ={' '}
        <span className='font-mono'>{decodedCode}</span>
      </div>
    </div>
  )
}
