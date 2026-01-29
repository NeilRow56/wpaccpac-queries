import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const taxationDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  // ✅ document-level attachments
  attachments: [
    {
      id: 'tax-comp',
      name: 'Tax computation',
      url: ''
    },
    {
      id: 'tax-proof',
      name: 'Proof of tax charge',
      url: ''
    }
  ],

  sections: [
    {
      id: 'charge-for-year',
      title: 'Charge for period',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'ct-current',
          label: 'Corporation tax — Current period',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'ct-overunder',
          label: 'Over/under provision',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'dt-charge',
          label: 'Deferred tax',
          amount: null
        },
        {
          kind: 'TOTAL',
          id: 'charge-total',
          label: 'Charge for period total',
          sumOf: ['ct-current', 'ct-overunder', 'dt-charge'],
          ui: { emphasis: 'strong', tone: 'info' }
        }
      ],
      notes: ''
    },
    {
      id: 'balances',
      title: 'Balances',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'ct-payable',
          label: 'Corporation tax payable/(repayable)',
          amount: null,
          notes:
            'Payable amounts automatically transferred to creditors. If repayable, include in Other debtors (not creditors).',
          ui: { emphasis: 'strong', tone: 'info' }
        },
        {
          kind: 'INPUT',
          id: 'dt-balance',
          label: 'Deferred tax balance',
          amount: null,
          ui: { emphasis: 'strong', tone: 'info' }
        }
      ],
      notes: ''
    }
  ]
}
