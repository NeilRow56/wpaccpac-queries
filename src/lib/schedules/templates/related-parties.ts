import type { SimpleScheduleDocV1 } from '@/lib/schedules/simpleScheduleTypes'

export const relatedPartiesDefault: SimpleScheduleDocV1 = {
  kind: 'SIMPLE_SCHEDULE',
  version: 1,

  // Optional: you can add an attachment slot for “separate schedule”
  attachments: [
    {
      id: 'related-parties-detail',
      name: 'Related parties detail schedule',
      url: ''
    }
  ],

  sections: [
    {
      id: 'directors-remuneration',
      title: 'Directors: Remuneration',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'directors-remuneration',
          label: 'Directors’ remuneration - total gross pay',
          amount: null
        }
      ],
      notes: ''
    },
    {
      id: 'pension',
      title: 'Pension contributions',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'pension-contributions',
          label: 'Pension - company contributions',
          amount: null
        }
      ],
      notes: ''
    },
    {
      id: 'bik',
      title: 'Benefits in kind',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        {
          kind: 'INPUT',
          id: 'benefits-in-kind',
          label: 'Benefits in kind - see p11d',
          amount: null
        }
      ],
      notes: ''
    },
    {
      id: 'dividends',
      title: 'Dividends',
      ui: { tone: 'primary', emphasis: 'strong' },
      lines: [
        { kind: 'INPUT', id: 'dividends', label: 'Dividends', amount: null }
      ],
      notes: ''
    },
    {
      id: 'statement',
      title: 'Statement',
      ui: { tone: 'muted', emphasis: 'soft' },
      lines: [],
      notes:
        'Related party transactions – attach a separate schedule.\n' +
        'In the professional judgement of the director / manager the above transactions were carried out under normal commercial conditions.'
    }
  ]
}
