// lib/planning/richtext-types.ts
import type { JSONContent } from '@tiptap/core'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function isTipTapDocJson(v: unknown): v is JSONContent {
  if (!isRecord(v)) return false
  if (v.type !== 'doc') return false
  // TipTap docs usually have content: [] but it can be missing; allow both.
  if ('content' in v && !Array.isArray(v.content)) return false
  return true
}
