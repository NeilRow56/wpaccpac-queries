import type { PlanningDocDef } from '@/planning/types'

const cfgBool = (v: boolean | undefined) => v === true
const cfgRisk = (v: 'normal' | 'elevated' | undefined) => v ?? 'normal'

export const B_DOCS: ReadonlyArray<PlanningDocDef> = [
  {
    code: 'B11',
    title: 'Planning Checklist',
    type: 'CHECKLIST',
    order: 11,
    defaultChecklist: [
      {
        id: 'perm-info-h',
        text: 'Ensure permanent information includes:'
      },
      {
        id: 'perm-info-1',
        text: 'An appropriate and up to date letter of engagement'
      },
      {
        id: 'perm-info-2',
        text: 'Laws and regulations relevant to the client'
      },
      {
        id: 'perm-info-3',
        text: 'Evidence of professional clearance where applicable'
      },
      {
        id: 'perm-info-4',
        text: 'Any independence issues, together with reasons that the firm acts for the client'
      },

      {
        id: 'ml-h',
        text: 'Money laundering and client due diligence:'
      },
      {
        id: 'ml-1',
        text: 'Confirm that we fully understand the ownership and control structure of the company, including beneficial ownership.  List all 25% beneficial owners.'
      },
      {
        id: 'ml-2',
        text: 'Since we last carried out work for the client, consider whether: The client has undergone significant change; or there have been changes in the nature and / or extent of the services we provide to them.'
      },
      {
        id: 'ml-3',
        text: 'Confirm correct ID is held on file'
      },
      {
        id: 'ml-4',
        text: 'Establish whether there are any reasons why we should not conduct this assignment (eg. insufficient expertise)'
      },
      {
        id: 'ml-5',
        text: 'Confirm that the company is eligible for audit exemption. Complete the eligibility checklist if there is any doubt, or if a member of a group'
      },
      {
        id: 'ml-6',
        text: 'Carry out an analytical review of the final figures, if analysis needed in accordance with firms policy, file on A71'
      },
      {
        id: 'ml-7',
        text: 'Has going concern been considered? Is there a going concern note in accounts if net liabilities?'
      },
      {
        id: 'ml-8',
        text: 'Consider need for disclosure checklist (ie major changes or first year)'
      },
      {
        id: 'ml-9',
        text: 'Ensure correct accountant’s report is included with accounts'
      },
      {
        id: 'ml-10',
        text: 'Schedule any outstanding points/significant matters for the reviewer’s attention on A25'
      },
      {
        id: 'ml-11',
        text: 'Consider whether a letter of representation is required, if so file on A51'
      }
    ]
  },

  {
    code: 'B12',
    title: 'Audit exemption – Eligibility Checklist',
    type: 'TEXT',
    order: 12,
    defaultText: '...',
    visibleWhen: cfg => cfgBool(cfg.auditExemptionApplies)
  },
  {
    code: 'B14-1',
    title: 'Assignment commencement checklist',
    type: 'TEXT',
    order: 141,
    defaultText: '...'
  },
  {
    code: 'B14-2',
    title: 'Money laundering – specific risk assessment checklist',
    type: 'TEXT',
    order: 142,
    defaultText: '...'
  },
  {
    code: 'B14-2(a)',
    title: 'Ownership and control',
    type: 'RICH_TEXT',
    order: 1421,
    defaultContentJson: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Ownership structure' }]
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'The company is owned as follows:' }]
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Mr A — 50% ordinary share capital' }
                  ]
                }
              ]
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Mr B — 50% ordinary share capital' }
                  ]
                }
              ]
            },
            // ✅ add this for any template that ends with a list
            { type: 'paragraph', content: [] }
          ]
        }
      ]
    },

    visibleWhen: cfg =>
      cfgBool(cfg.ownershipComplex) ||
      cfgRisk(cfg.moneyLaunderingRiskLevel) !== 'normal'
  },

  {
    code: 'B21',
    title: 'Notes from discussions with client',
    type: 'NOTES',
    order: 21
  },
  {
    code: 'B41',
    title: 'Materiality',
    type: 'TEXT',
    order: 41,
    defaultText: '...',
    visibleWhen: cfg => cfgBool(cfg.materialityRequired)
  },
  {
    code: 'B61-fixed_assets',
    title: 'Fixed assets & investments — work programme',
    type: 'RICH_TEXT',
    // pick an order that sits in Section B near the other B6x docs
    order: 6161,
    defaultContentJson: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'FIXED ASSETS & INVESTMENTS' }]
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Agree lead schedule to accounts' }
                  ]
                }
              ]
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Schedule fixed asset additions and disposals. Ensure all are dated'
                    }
                  ]
                }
              ]
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Review depreciation calculations and consider if any asset writedowns are needed'
                    }
                  ]
                }
              ]
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Review repairs for any capital expenditure if necessary'
                    }
                  ]
                }
              ]
            },

            // ✅ keep this for any template that ends with a list
            { type: 'paragraph', content: [] }
          ]
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Notes / conclusions (add more work steps or findings below):'
            }
          ]
        },
        {
          type: 'paragraph',
          content: []
        }
      ]
    },

    // show it for everyone by default (or add your own cfg logic)
    visibleWhen: () => true
  }
]
