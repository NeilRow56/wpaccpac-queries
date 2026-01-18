export type PlanningDocType = 'TEXT' | 'NOTES' | 'CHECKLIST'

export type PlanningPackConfig = Partial<{
  auditExemptionApplies: boolean
  hasGroupOrDoubtOnEligibility: boolean
  moneyLaunderingRiskLevel: 'normal' | 'elevated'
  ownershipComplex: boolean
  materialityRequired: boolean
}>

export type ChecklistRowDef = {
  id: string
  text: string
}

/**
 * Registry definition type (what lives in B_DOCS)
 */
export type PlanningDocDef =
  | {
      code: string
      title: string
      type: 'TEXT' | 'NOTES'
      order: number
      defaultText?: string
      visibleWhen?: (cfg: PlanningPackConfig) => boolean
    }
  | {
      code: string
      title: string
      type: 'CHECKLIST'
      order: number
      defaultChecklist: ChecklistRowDef[]
      visibleWhen?: (cfg: PlanningPackConfig) => boolean
    }
