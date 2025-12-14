// import { headers } from 'next/headers'
// import { redirect } from 'next/navigation'
// import { auth } from '@/lib/auth'

// /**
//  * Checks for a valid session.
//  * If missing, redirects to '/' (or a specified path),
//  * avoiding loops on allowed paths.
//  *
//  * @param options.allowPaths Array of paths that bypass the redirect (default ['/'])
//  * @param options.redirectTo Path to redirect to if no session (default '/')
//  * @returns The session object if present
//  */
// export async function requireSession(options?: {
//   allowPaths?: string[]
//   redirectTo?: string
// }) {
//   const { allowPaths = ['/'], redirectTo = '/' } = options ?? {}

//   const currentHeaders = await headers()
//   // Use x-invoke-pathname header if available, else default to '/'
//   const pathname = currentHeaders.get('x-invoke-pathname') ?? '/'

//   const session = await auth.api.getSession({ headers: currentHeaders })

//   if (!session && !allowPaths.includes(pathname)) {
//     console.log(
//       `[requireSession] No session found on "${pathname}", redirecting to "${redirectTo}"`
//     )
//     redirect(redirectTo)
//   } else {
//     console.log(`[requireSession] Session found on "${pathname}"`)
//   }

//   return session
// }
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { extractUserId } from './extract-user-Id'

/**
 * Checks for a valid session.
 * Also ensures the user is NOT archived.
 */
export async function requireSession(options?: {
  allowPaths?: string[]
  redirectTo?: string
}) {
  const { allowPaths = ['/'], redirectTo = '/' } = options ?? {}

  const currentHeaders = await headers()
  const pathname = currentHeaders.get('x-invoke-pathname') ?? '/'

  const session = await auth.api.getSession({ headers: currentHeaders })

  if (!session && !allowPaths.includes(pathname)) {
    redirect(redirectTo)
  }

  // 🔐 Extract userId safely
  const userId = extractUserId(session)
  if (!userId) {
    redirect(redirectTo)
  }

  // 🔒 Check archived status
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      archivedAt: true
    }
  })

  if (!dbUser || dbUser.archivedAt) {
    // Optional: log or track
    redirect('/account-archived')
  }

  return session
}
