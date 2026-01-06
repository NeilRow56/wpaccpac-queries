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
import {
  closeAccountingPeriodAction,
  rollAccountingPeriod
} from '@/server-actions/accounting-periods'

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

  const isClose = action.type === 'close'
  const period = action.period

  const title = isClose
    ? 'Close accounting period'
    : 'Roll accounting period forward'

  const description = isClose ? (
    <>
      This will <strong>lock</strong> the period <em>{period.periodName}</em>.
      <br />
      The period cannot be reopened.
    </>
  ) : (
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
        if (isClose) {
          await closeAccountingPeriodAction({
            clientId,
            periodId: period.id
          })

          toast.success('Accounting period closed successfully')
        } else {
          await rollAccountingPeriod({
            clientId,
            periodName: 'Next Period', // can be derived later
            startDate: period.endDate,
            endDate: undefined // your roll-forward logic
          })

          toast.success('Accounting period rolled forward successfully')
        }

        onClose()
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

          <Button
            variant={isClose ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending
              ? isClose
                ? 'Closing…'
                : 'Rolling…'
              : isClose
                ? 'Close period'
                : 'Roll forward'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
