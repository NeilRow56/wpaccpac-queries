// src/lib/accounts-completion/a11-status.ts
export type A11Status = 'DRAFT' | 'UPLOADED' | 'SIGNED_OFF'

export function getA11Status(opts: {
  hasPdf: boolean
  hasSignoff: boolean
}): A11Status {
  if (opts.hasSignoff) return 'SIGNED_OFF'
  if (opts.hasPdf) return 'UPLOADED'
  return 'DRAFT'
}
