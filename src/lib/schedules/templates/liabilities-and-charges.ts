import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const liabilitiesAndChargesDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  attachments: [
    { id: 'tax-transfer', name: 'Taxation transfer support', url: '' },
    {
      id: 'other-support',
      name: 'Other supporting schedules / journals',
      url: ''
    }
  ],

  sections: [
    {
      id: 'movement',
      title: 'Movement and balance reconciliation',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'bf-balance',
          label: 'Balance brought forward',
          amount: null
          // notes: 'Auto-populated from prior period closing balance.'
        },
        {
          kind: 'INPUT',
          id: 'opening-adjustment',
          label: 'Opening adjustment (historic / migration)',
          amount: null,
          notes:
            'Use for historic value b/f -if no prior period schedule exists.',
          ui: { tone: 'warn', emphasis: 'soft' }
        },

        {
          kind: 'INPUT',
          id: 'tc-movement',
          label: 'Movement: Taxation (charge for period)',
          amount: null
          // notes: 'Auto-transferred from the Taxation schedule.'
        },

        {
          kind: 'INPUT',
          id: 'other-movement',
          label: 'Movement: Other (manual)',
          amount: null
        },

        {
          kind: 'TOTAL',
          id: 'net-movement',
          label: 'Net movement',
          sumOf: ['other-movement', 'tc-movement'], // ✅ manual only
          ui: { emphasis: 'strong', tone: 'info' }
        },

        {
          kind: 'CALC',
          id: 'cf-balance',
          label: 'Balance carried forward',
          add: [
            'bf-balance',
            'opening-adjustment',
            'other-movement',
            'tc-movement'
          ],
          ui: { emphasis: 'strong', tone: 'info' }
        },

        {
          kind: 'INPUT',
          id: 'tax-period-end-balance',
          label: 'Taxation balance at period end',
          amount: null,
          // notes: 'Auto-transferred from the Taxation schedule.',
          ui: { emphasis: 'strong', tone: 'info' }
        },

        {
          kind: 'CALC',
          id: 'difference',
          label: 'Difference (reconciling item)',
          add: [
            'bf-balance',
            'opening-adjustment',
            'tc-movement',
            'other-movement'
          ], // (and tax-movement if you still include it)
          subtract: ['tax-period-end-balance']
          // notes:
          //   'Should be nil if this schedule exactly represents the same liability as the transferred taxation balance.'
        }
      ],
      notes: ''
    }
  ]
}
