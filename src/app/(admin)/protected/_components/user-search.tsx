'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export function UserSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initial = searchParams.get('q') ?? ''
  const [value, setValue] = useState(initial)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        params.set('q', value)
      } else {
        params.delete('q')
      }

      // 🔑 reset page
      params.delete('page')

      router.replace(`?${params.toString()}`)
    }, 400) // debounce

    return () => clearTimeout(timeout)
  }, [value, router, searchParams])

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      placeholder='Search users…'
      className='w-full max-w-sm rounded-md border px-3 py-2 text-sm'
    />
  )
}
