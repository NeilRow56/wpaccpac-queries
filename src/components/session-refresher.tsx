'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function SessionRefresher() {
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    async function refresh() {
      if (!mounted) return

      try {
        const res = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' }
        })

        if (res.status === 401) {
          // Session expired
          toast.error('Your session has expired. Redirecting to login...', {
            duration: 5000
          })
          setTimeout(() => {
            router.push('/auth')
          }, 1000)
        }
      } catch (err) {
        // Optional: network error, ignore and retry next interval
        console.log(err)
      }
    }

    // 1) Refresh immediately on mount
    refresh()

    // 2) Refresh every 4 minutes
    const interval = setInterval(refresh, 4 * 60 * 1000)

    // 3) Refresh on tab focus
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // 4) Refresh on network reconnect
    const onOnline = () => refresh()
    window.addEventListener('online', onOnline)

    return () => {
      mounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    }
  }, [router])

  return null
}
