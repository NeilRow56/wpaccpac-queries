'use client'

import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'

type Props = {
  page: number
  totalPages: number
  search?: string
}

export function Pagination({ page, totalPages, search }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  function goToPage(p: number) {
    const next = new URLSearchParams(params.toString())
    next.set('page', String(p))
    if (search) next.set('search', search)
    router.push(`?${next.toString()}`)
  }

  return (
    <div className='flex items-center justify-end gap-2'>
      <Button
        variant='outline'
        disabled={page <= 1}
        onClick={() => goToPage(page - 1)}
      >
        Previous
      </Button>

      <span className='text-sm'>
        Page {page} of {totalPages}
      </span>

      <Button
        variant='outline'
        disabled={page >= totalPages}
        onClick={() => goToPage(page + 1)}
      >
        Next
      </Button>
    </div>
  )
}
