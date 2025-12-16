// lib/requireSession.ts
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user as userTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { extractUserId } from './extract-user-Id'
import { nextHeadersToObject } from './nextHeadersToObject'

/**
 * Checks for a valid Better Auth session and user
 * Optionally allows public paths, else redirects
 */
export async function requireSession(options?: {
  allowPaths?: string[]
  redirectTo?: string
}) {
  const { allowPaths = ['/'], redirectTo = '/auth' } = options ?? {}

  // Use Next.js App Router headers -> plain object
  const headersObj = await nextHeadersToObject()
  const pathname = headersObj['x-invoke-pathname'] ?? '/'

  // Check if current path is allowed
  const isAllowedPath = allowPaths.includes(pathname)

  // Get session
  const session = await auth.api.getSession({ headers: headersObj })

  // If no session and not on allowed path, redirect
  if (!session && !isAllowedPath) {
    redirect(redirectTo)
  }

  const userId = extractUserId(session)

  // If no userId and not on allowed path, redirect
  if (!userId && !isAllowedPath) {
    redirect(redirectTo)
  }

  // Only validate user status if we have a userId
  if (userId) {
    const dbUser = await db.query.user.findFirst({
      where: eq(userTable.id, userId),
      columns: { archivedAt: true }
    })

    if (!dbUser || dbUser.archivedAt) {
      redirect('/account-archived')
    }
  }

  return session
}
