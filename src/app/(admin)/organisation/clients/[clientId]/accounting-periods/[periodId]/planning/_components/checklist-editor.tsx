'use client'

import { Button } from '@/components/ui/button'
import type { ChecklistDoc } from '@/lib/planning/checklist-types'
import { cn } from '@/lib/utils'

export default function ChecklistEditor(props: {
  value: ChecklistDoc
  onChange: (next: ChecklistDoc) => void
}) {
  const { value, onChange } = props

  function setRowResponse(rowId: string, next: 'AGREED' | 'NA') {
    onChange({
      ...value,
      rows: value.rows.map(r => {
        if (r.id !== rowId) return r
        return { ...r, response: r.response === next ? null : next }
      })
    })
  }

  return (
    <div className='rounded-md border'>
      <div className='text-muted-foreground grid grid-cols-[1fr_160px] border-b px-3 py-2 text-xs font-medium'>
        <div>Procedure</div>
        <div className='text-right'>Agreed / N/A</div>
      </div>

      {value.rows.map(row => {
        const isHeading = row.text.trim().endsWith(':')

        return (
          <div
            key={row.id}
            className={cn(
              'grid grid-cols-[1fr_160px] items-center gap-3 border-b px-3 py-2',
              isHeading && 'bg-muted/30'
            )}
          >
            <div className={cn('text-sm', isHeading && 'font-semibold')}>
              {row.text}
            </div>

            {isHeading ? (
              // keep column alignment, but no controls
              <div />
            ) : (
              <div className='flex justify-end gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant={row.response === 'AGREED' ? 'default' : 'outline'}
                  onClick={() => setRowResponse(row.id, 'AGREED')}
                >
                  Agreed
                </Button>

                <Button
                  type='button'
                  size='sm'
                  variant={row.response === 'NA' ? 'default' : 'outline'}
                  onClick={() => setRowResponse(row.id, 'NA')}
                >
                  N/A
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
