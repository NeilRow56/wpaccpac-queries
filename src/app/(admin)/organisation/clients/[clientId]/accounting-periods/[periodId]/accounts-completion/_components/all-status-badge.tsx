// src/app/organisation/clients/[clientId]/accounting-periods/[periodId]/accounts-completion/_components/a11-status-badge.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { A11Status } from '@/lib/accounts-completion/all-status'

export function A11StatusBadge({ status }: { status: A11Status }) {
  const label =
    status === 'SIGNED_OFF'
      ? 'Signed off'
      : status === 'UPLOADED'
        ? 'Uploaded'
        : 'Draft'

  // Keep styling conservative (no hard-coded colors needed)
  const variant = status === 'SIGNED_OFF' ? 'default' : 'secondary'

  return <Badge variant={variant}>{label}</Badge>
}
