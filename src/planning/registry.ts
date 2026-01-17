import type { PlanningDocDef } from './types'

const cfgBool = (v: boolean | undefined) => v === true
const cfgRisk = (v: 'normal' | 'elevated' | undefined) => v ?? 'normal'

export const B_DOCS: PlanningDocDef[] = [
  {
    code: 'B11',
    title: 'Planning Checklist',
    type: 'TEXT',
    order: 11,
    defaultText: '...'
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
