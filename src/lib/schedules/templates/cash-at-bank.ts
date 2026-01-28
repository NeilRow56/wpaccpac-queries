import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const cashAtBankLeadDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [
    { id: 'bank-statements', name: 'Bank statements', url: '' },
    { id: 'bank-recon', name: 'Bank reconciliation / working papers', url: '' },
    { id: 'cash-count', name: 'Cash count / petty cash support', url: '' }
  ],

  sections: [
    {
      id: 'summary',
      title: 'Cash at bank and in hand',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'right-of-set-off',
          label: 'Right of set-off exists for bank balances (0 = No, 1 = Yes)',
          amount: 0,
          ui: { emphasis: 'soft', tone: 'muted' }
        },
        {
          kind: 'INPUT',
          id: 'cash-at-bank',
          label: 'Cash at bank (positive balances only)',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'cash-at-bank-special-cases',
          label:
            'Cash at bank — special cases (not in bank accounts schedule e.g. escrow)',
          amount: null,
          ui: { emphasis: 'soft', tone: 'muted' }
        },
        {
          kind: 'INPUT',
          id: 'cash-in-hand',
          label: 'Cash in hand',
          amount: null
        },
        {
          kind: 'TOTAL',
          id: 'cash-total',
          label: 'Total cash and cash equivalents',
          sumOf: ['cash-at-bank', 'cash-at-bank-special-cases', 'cash-in-hand'],
          ui: { emphasis: 'strong', tone: 'info' }
        },
        {
          kind: 'INPUT',
          id: 'bank-overdraft-memo',
          label: 'Bank overdrafts (net where right of set-off exists)',
          amount: null,
          ui: { emphasis: 'soft', tone: 'muted' }
        }
      ],
      notes:
        'Cash at bank excludes overdrawn accounts where no right of set-off exists. Overdrafts are disclosed in creditors.'
    }
  ]
}
