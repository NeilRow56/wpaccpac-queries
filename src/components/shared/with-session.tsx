//USAGE EXAMPLE
//import { withSession } from '@/lib/withSession'
////import ClientsTablePage from './clients-table-page'

//export default withSession(ClientsTablePage, {
//  fallback: <p>Loading clients...</p>,
// allowPaths: ['/'],  // Home page won’t redirect
//redirectTo: '/'     // Redirect to home if session missing
//})

'use client'

import React, { Suspense, useEffect, useState } from 'react'

import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/requireSession'

type WithSessionOptions = {
  fallback?: React.ReactNode
  allowPaths?: string[]
  redirectTo?: string
}

/**
 * HOC to wrap a client component with Suspense and session check
 */
export function withSession<P extends object>(
  Component: React.ComponentType<P>,
  options?: WithSessionOptions
): React.FC<P> {
  const {
    fallback = <p>Loading...</p>,
    allowPaths = ['/'],
    redirectTo = '/'
  } = options ?? {}

  const WrappedComponent: React.FC<P> = props => {
    const [sessionChecked, setSessionChecked] = useState(false)

    useEffect(() => {
      const check = async () => {
        try {
          const session = await requireSession({ allowPaths, redirectTo })
          if (!session) {
            // fallback redirect in case requireSession doesn't redirect (rare)
            redirect(redirectTo)
          }
        } catch (err) {
          console.error('[withSession] Session check failed', err)
          redirect(redirectTo)
        } finally {
          setSessionChecked(true)
        }
      }
      check()
    }, [])

    if (!sessionChecked) return <>{fallback}</>

    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    )
  }

  WrappedComponent.displayName = `withSession(${
    Component.displayName || Component.name || 'Component'
  })`

  return WrappedComponent
}
