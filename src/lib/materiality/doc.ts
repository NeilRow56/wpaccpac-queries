export type MaterialityDocV1 = {
  kind: 'MATERIALITY'
  version: 1
  generatedMarkdown: string
  generatedAt: string // ISO
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function normalizeMaterialityDoc(raw: unknown): MaterialityDocV1 | null {
  if (!isRecord(raw)) return null
  if (raw.kind !== 'MATERIALITY' || raw.version !== 1) return null

  const generatedMarkdown =
    typeof raw.generatedMarkdown === 'string' ? raw.generatedMarkdown : null
  const generatedAt =
    typeof raw.generatedAt === 'string' ? raw.generatedAt : null

  if (!generatedMarkdown || !generatedAt) return null

  return {
    kind: 'MATERIALITY',
    version: 1,
    generatedMarkdown,
    generatedAt
  }
}
