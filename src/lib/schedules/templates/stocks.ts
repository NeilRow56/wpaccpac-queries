import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const stocksDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [
    { id: 'finished-goods', name: 'Finished goods', url: '' },
    { id: 'work-in-progress', name: 'Work in progress', url: '' },
    { id: 'raw-materials', name: 'Raw materials', url: '' }
  ],

  sections: [
    {
      id: 'summary',
      title: 'Stocks',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'finished-goods',
          label: 'Finished goods',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'work-in-progress',
          label: 'Work in progress',
          amount: null
        },
        {
          kind: 'INPUT',
          id: 'raw-materials',
          label: 'Raw materials',
          amount: null
        },
        {
          kind: 'TOTAL',
          id: 'stocks-total',
          label: 'Total stock value',
          sumOf: ['finished-goods', 'work-in-progress', 'raw-materials'],
          ui: { emphasis: 'strong', tone: 'info' }
        }
      ],
      notes: ''
    }
  ]
}
