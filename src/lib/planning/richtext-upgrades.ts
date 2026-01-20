// lib/planning/richtext-upgrades.ts
import type { JSONContent } from '@tiptap/core'
import { isTipTapDocJson } from './richtext-types'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function getHeadingLevel(node: unknown): number | undefined {
  if (!isRecord(node)) return undefined
  if (node.type !== 'heading') return undefined
  const attrs = node.attrs
  if (!isRecord(attrs)) return undefined
  const level = attrs.level
  return typeof level === 'number' ? level : undefined
}

export function upgradeTitleHeadingToH1(v: unknown): unknown {
  if (!isTipTapDocJson(v)) return v

  const content = v.content ?? []
  const first = content[0]

  if (getHeadingLevel(first) !== 2) return v

  // we know first is a record heading node now (structurally),
  // but we still treat it as unknown/object to keep it safe.
  const firstObj = first as Record<string, unknown>
  const attrsObj = (isRecord(firstObj.attrs) ? firstObj.attrs : {}) as Record<
    string,
    unknown
  >

  const upgradedFirst: Record<string, unknown> = {
    ...firstObj,
    attrs: { ...attrsObj, level: 1 }
  }

  const upgraded: JSONContent = {
    ...v,
    content: [upgradedFirst as unknown as JSONContent, ...content.slice(1)]
  }

  return upgraded
}
