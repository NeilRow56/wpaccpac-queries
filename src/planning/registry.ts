import type { PlanningDocDef } from './types'

const cfgBool = (v: boolean | undefined) => v === true
const cfgRisk = (v: 'normal' | 'elevated' | undefined) => v ?? 'normal'

export const B_DOCS: PlanningDocDef[] = [
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
        text: 'Signed client acceptance documentation'
      },
      {
        id: 'perm-info-3',
        text: 'Evidence of professional clearance where applicable'
      },

      {
        id: 'ml-h',
        text: 'Money laundering and client due diligence:'
      },
      {
        id: 'ml-1',
        text: 'Client due diligence completed and up to date'
      },
      {
        id: 'ml-2',
        text: 'Money laundering risk assessment documented'
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
    type: 'TEXT',
    order: 1421,
    defaultText: '...',
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
  }
]
