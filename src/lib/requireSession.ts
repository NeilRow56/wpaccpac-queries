// import { requireSession } from '@/lib/requireSession'

//export default async function DashboardPage() {
//    const session = await requireSession({
//      allowPaths: ['/'],
//      redirectTo: '/'
//    })

//    return <div>Welcome {session.user?.email}</div>
//  }

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

/**
 * Checks for a valid session.
 * If missing, redirects to '/' (or a specified path),
 * avoiding loops on allowed paths.
 *
 * @param options.allowPaths Array of paths that bypass the redirect (default ['/'])
 * @param options.redirectTo Path to redirect to if no session (default '/')
 * @returns The session object if present
 */
export async function requireSession(options?: {
  allowPaths?: string[]
  redirectTo?: string
}) {
  const { allowPaths = ['/'], redirectTo = '/' } = options ?? {}

  const currentHeaders = await headers()
  // Use x-invoke-pathname header if available, else default to '/'
  const pathname = currentHeaders.get('x-invoke-pathname') ?? '/'

  const session = await auth.api.getSession({ headers: currentHeaders })

  if (!session && !allowPaths.includes(pathname)) {
    console.log(
      `[requireSession] No session found on "${pathname}", redirecting to "${redirectTo}"`
    )
    redirect(redirectTo)
  } else {
    console.log(`[requireSession] Session found on "${pathname}"`)
  }

  return session
}
