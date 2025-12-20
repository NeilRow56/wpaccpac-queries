'use client'

import { useEffect, useState } from 'react'
import { getUserArchiveInfo } from '@/server-actions/users'

export function ArchivedCell({
  userId,
  refreshTrigger
}: {
  userId: string
  refreshTrigger: number
}) {
  const [archivedAt, setArchivedAt] = useState<Date | null>(null)

  useEffect(() => {
    let mounted = true

    getUserArchiveInfo(userId).then(date => {
      if (mounted) setArchivedAt(date)
    })

    return () => {
      mounted = false
    }
  }, [userId, refreshTrigger])

  if (!archivedAt) {
    return <span className='text-muted-foreground'>—</span>
  }

  return <>{archivedAt.toLocaleDateString('en-GB')}</>
}
