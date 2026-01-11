'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useTransition } from 'react'

import { PeriodAction } from './use-period-action-modal'
import { rollAccountingPeriod } from '@/server-actions/accounting-periods'
import { ClosePeriodModal } from '@/app/(admin)/organisation/clients/[clientId]/accounting-periods/_components/close-period-modal'

export function PeriodActionModal({
  action,
  clientId,
  onClose
}: {
  action: PeriodAction
  clientId: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  const period = action.period
  const isClose = action.type === 'close'

  // ✅ Best solution: route "close" through ClosePeriodModal (single source of truth)
  if (isClose) {
    return (
      <ClosePeriodModal period={period} clientId={clientId} onClose={onClose} />
    )
  }

  // Keep "roll" (if you still use it)
  const title = 'Roll accounting period forward'
  const description = (
    <>
      This will <strong>close</strong> <em>{period.periodName}</em> and create a
      new accounting period.
      <br />
      This action cannot be undone.
    </>
  )

  function onConfirm() {
    startTransition(async () => {
      try {
        const result = await rollAccountingPeriod({
          clientId,
          periodName: 'Next Period', // TODO: remove/derive or delete roll-forward flow
          startDate: period.endDate,
          endDate: undefined
        })

        if (result?.success) {
          toast.success('Accounting period rolled forward successfully')
          onClose()
        } else {
          toast.error(
            result?.error ?? 'Failed to roll accounting period forward'
          )
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Something went wrong'
        toast.error(message)
      }
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className='flex justify-end gap-2 pt-4'>
          <Button variant='outline' onClick={onClose} disabled={pending}>
            Cancel
          </Button>

          <Button variant='default' onClick={onConfirm} disabled={pending}>
            {pending ? 'Rolling…' : 'Roll forward'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
