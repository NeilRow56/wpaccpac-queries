// src/app/organisation/clients/[clientId]/accounting-periods/[periodId]/accounts-completion/_components/pdf-preview.tsx
'use client'

import { Button } from '@/components/ui/button'

export function PdfPreview({
  url,
  title = 'Financial statements PDF'
}: {
  url: string
  title?: string
}) {
  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <Button asChild variant='secondary' size='sm'>
          <a href={url} target='_blank' rel='noreferrer'>
            Open PDF in new tab
          </a>
        </Button>
      </div>

      <div className='w-full overflow-hidden rounded-xl border'>
        <iframe
          title={title}
          src={url}
          className='h-[75vh] w-full'
          // sandbox is optional; include if your PDF hosting allows it
          // sandbox="allow-same-origin allow-scripts allow-downloads"
        />
      </div>

      <p className='text-muted-foreground text-sm'>
        If the preview doesn’t load, use “Open PDF in new tab”.
      </p>
    </div>
  )
}
