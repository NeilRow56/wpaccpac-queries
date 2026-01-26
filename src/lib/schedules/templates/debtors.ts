import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const debtorsDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [
    { id: 'ar-ledger', name: 'Trade debtor listing', url: '' },
    {
      id: 'post-year-end',
      name: 'Post year-end receipts / bank support',
      url: ''
    },
    { id: 'bad-debt', name: 'Bad debt / provisions support', url: '' }
  ],

  sections: [
    {
      id: 'summary',
      title: 'Debtors',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'trade-debtors',
          label: 'Trade debtors',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'other-debtors',
          label: 'Other debtors',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'prepayments',
          label: 'Prepayments',
          amount: null
        },
        {
          kind: 'TOTAL',
          id: 'debtors-gross-total',
          label: 'Debtors total (gross)',
          sumOf: ['trade-debtors', 'other-debtors', 'prepayments'],
          ui: { emphasis: 'strong', tone: 'info' }
        },
        {
          kind: 'CALC',
          id: 'debtors-net-total',
          label: 'Debtors total (net)',
          add: ['trade-debtors', 'other-debtors', 'prepayments'],
          subtract: ['bad-debt-provision'],
          notes: 'Net of provision for doubtful debts.',
          ui: { emphasis: 'strong', tone: 'info' }
        }
      ],
      notes: ''
    },
    {
      id: 'provision',
      title: 'Provision / impairment',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'bad-debt-provision',
          label: 'Provision for doubtful debts (if applicable)',
          amount: null,
          ui: { emphasis: 'soft', tone: 'muted' }
        }
      ],
      notes: ''
    }
  ]
}
