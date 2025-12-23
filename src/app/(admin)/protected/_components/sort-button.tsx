'use client'

import { ArrowUpDown } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function SortButton({
  label,
  sortKey
}: {
  label: string
  sortKey: string
}) {
  const router = useRouter()
  const params = useSearchParams()

  const currentSort = params.get('sort')
  const currentDir = params.get('dir') ?? 'asc'
  const isActive = currentSort === sortKey
  const nextDir =
    currentSort === sortKey && currentDir === 'asc' ? 'desc' : 'asc'

  function onClick() {
    const p = new URLSearchParams(params.toString())
    p.set('sort', sortKey)
    p.set('dir', nextDir)
    p.delete('page')

    router.replace(`?${p.toString()}`)
  }

  return (
    <button onClick={onClick} className='flex items-center gap-1'>
      {label}

      {isActive ? (
        currentDir === 'asc' ? (
          '↑'
        ) : (
          '↓'
        )
      ) : (
        <ArrowUpDown className='h-4 w-4' />
      )}
    </button>
  )
}
