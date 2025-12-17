'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'

import { authClient } from '@/lib/auth-client'

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  // console.log(Object.fromEntries(searchParams.entries()))

  useEffect(() => {
    let mounted = true

    async function checkSession() {
      const { data: session } = await authClient.getSession()

      if (!mounted) return

      // ✅ Respect callbackUrl first (email verification)
      const callbackUrl =
        searchParams.get('callbackUrl') ??
        searchParams.get('redirect') ??
        '/dashboard'

      if (session) {
        router.replace(callbackUrl)
        return
      }

      setLoading(false)
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [router, searchParams])

  if (loading) {
    return (
      <div className='flex min-h-svh items-center justify-center'>
        <span className='text-muted-foreground text-sm'>Loading…</span>
      </div>
    )
  }

  return (
    <div className='flex min-h-svh flex-col items-center bg-gray-300 p-6 md:p-10'>
      <div className='mt-48 w-full max-w-xs md:max-w-[850px]'>
        <Link href='/' className='mb-6 inline-flex items-center justify-start'>
          <ArrowLeftIcon className='text-primary mr-2 size-4' />
          <span className='text-primary font-bold'>Back to Home Page</span>
        </Link>

        {children}
      </div>
    </div>
  )
}
