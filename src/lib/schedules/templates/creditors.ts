import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const creditorsDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [
    { id: 'purc-ledger', name: 'Trade creditor listing', url: '' },
    {
      id: 'post-year-end',
      name: 'Post year-end payments / bank support',
      url: ''
    },
    { id: 'directors-loans', name: 'Directors Loans support', url: '' }
  ],

  sections: [
    {
      id: 'summary',
      title: 'Creditors - due within one year',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'trade-creditors',
          label: 'Trade creditors',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'corp-tax-payable',
          label: 'Corporation tax payable',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'vat-paye-nic',
          label: 'VAT and other taxes',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'accruals-deferred-income',
          label: 'Accruals and deferred income',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'dividends-payable',
          label: 'Dividends payable',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'directors-loans-balance',
          label: 'Directors Loans',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'loans-within-one-year',
          label: 'Loans due within one year',
          amount: null
        },
        {
          kind: 'TOTAL',
          id: 'creditors-gross-total',
          label: 'Creditors falling due within one year - total',
          sumOf: [
            'trade-creditors',
            'corp-tax-payable',
            'vat-paye-nic',
            'accruals-deferred-income',
            'dividends-payable',
            'directors-loans-balance',
            'loans-within-one-year'
          ],
          ui: { emphasis: 'strong', tone: 'info' }
        }
      ],
      notes: ''
    },
    {
      id: 'long-term-summary',
      title: 'Creditors - due in more than one year',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'loans-more-than-one-year',
          label: 'Loans due in more than one year',
          amount: null,
          ui: { emphasis: 'soft', tone: 'muted' }
        },
        {
          kind: 'INPUT',
          id: 'other-long-term-creditors',
          label: 'Other long-term creditors',
          amount: null
        },
        {
          kind: 'TOTAL',
          id: 'creditors-long-term-gross-total',
          label: 'Creditors falling due in more than one year - total',
          sumOf: ['loans-more-than-one-year', 'other-long-term-creditors'],
          ui: { emphasis: 'strong', tone: 'info' }
        }
      ],
      notes: ''
    }
  ]
}
