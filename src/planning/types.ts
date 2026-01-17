export type PlanningDocType = 'TEXT' | 'NOTES'

export type PlanningPackConfig = Partial<{
  auditExemptionApplies: boolean
  hasGroupOrDoubtOnEligibility: boolean
  moneyLaunderingRiskLevel: 'normal' | 'elevated'
  ownershipComplex: boolean
  materialityRequired: boolean
}>

export type PlanningDocDef = {
  code: string // "B11", "B14-2(a)"
  title: string
  type: PlanningDocType
  order: number // for display sorting
  defaultText?: string // for TEXT docs
  visibleWhen?: (cfg: PlanningPackConfig) => boolean
}
