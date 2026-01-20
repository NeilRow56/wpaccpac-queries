import type { JSONContent } from '@tiptap/core'

export type PlanningDocType = 'TEXT' | 'NOTES' | 'CHECKLIST' | 'RICH_TEXT'

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
  | {
      code: string
      title: string
      type: 'RICH_TEXT'
      order: number
      defaultContentJson: JSONContent // ✅ REQUIRED
      visibleWhen?: (cfg: PlanningPackConfig) => boolean
    }
