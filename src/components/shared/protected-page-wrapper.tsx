// src/components/wrappers/protected-page-wrapper.tsx

// HOW TO USE IT

// Logs attempted paths when session is missing.

// Supports multiple fallback options (customizable UI for loading states).

// Works seamlessly with nested Suspense boundaries.

// Allows multiple public/allowed paths.

// Prevents redirect loops reliably.

// import React, { Suspense } from 'react'
// import { ProtectedPage } from '@/components/wrappers/ProtectedPage'
// import { Skeleton } from '@/components/shared/skeleton'

// export default function DashboardPage() {
//   return (
//     <ProtectedPage fallback={<Skeleton />}>
//       <Suspense fallback={<Skeleton />}>
//         <div>Admin Dashboard Content Here</div>
//       </Suspense>
//     </ProtectedPage>
//   )
// }

// src/components/wrappers/ProtectedPage.tsx
'use client'

import React, { ReactNode, useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'

interface ProtectedPageProps {
  children: ReactNode
  fallback?: ReactNode | (() => ReactNode)
  allowPaths?: string[] // paths that bypass session check
  onRedirectAttempt?: (attemptedPath: string) => void // optional logging
}

export const ProtectedPage: React.FC<ProtectedPageProps> = ({
  children,
  fallback = <div>Loading...</div>,
  allowPaths = ['/'],
  onRedirectAttempt
}) => {
  const router = useRouter()
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await auth.api.getSession()
        const pathname = window.location.pathname

        // Log attempted path if session is missing
        if (!session && !allowPaths.includes(pathname)) {
          console.warn(
            `[ProtectedPage] Redirecting unauthenticated user from: ${pathname}`
          )
          onRedirectAttempt?.(pathname)

          router.replace('/') // safe redirect
          return
        }

        setHasSession(true)
      } catch (err) {
        console.error('[ProtectedPage] Error checking session:', err)
        router.replace('/')
      }
    }

    checkSession()
  }, [router, allowPaths, onRedirectAttempt])

  // Render fallback until session check completes
  if (hasSession === null) {
    return typeof fallback === 'function' ? fallback() : fallback
  }

  // Wrap children in Suspense to support nested Suspense boundaries
  return (
    <Suspense fallback={typeof fallback === 'function' ? fallback() : fallback}>
      {children}
    </Suspense>
  )
}
