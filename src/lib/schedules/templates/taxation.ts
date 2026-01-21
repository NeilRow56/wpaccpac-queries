import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const taxationDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,
  sections: [
    {
      id: 'charge-for-year',
      title: 'Charge for year',
      lines: [
        {
          kind: 'INPUT',
          id: 'ct-current',
          label: 'Corporation tax — Current year',
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
          label: 'Charge for year total',
          sumOf: ['ct-current', 'ct-overunder', 'dt-charge']
        }
      ],
      notes: ''
    },
    {
      id: 'balances',
      title: 'Balances',
      lines: [
        {
          kind: 'INPUT',
          id: 'ct-payable',
          label: 'Corporation tax payable/(repayable)',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'dt-balance',
          label: 'Deferred tax balance',
          amount: null
        }
      ],
      notes: ''
    }
  ]
}
