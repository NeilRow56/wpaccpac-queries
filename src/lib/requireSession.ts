import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user as userTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { extractUserId } from './extract-user-Id'
import { headers } from 'next/headers'

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
    where: eq(userTable.id, userId),
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
