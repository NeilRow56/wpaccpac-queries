import { B_DOCS } from '@/planning/registry'

export function getPlanningDocDef(code: string) {
  return B_DOCS.find(d => d.code === code) ?? null
}
