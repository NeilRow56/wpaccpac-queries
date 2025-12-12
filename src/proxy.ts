// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Fully safe middleware to protect authenticated routes.
 * - Redirects missing sessions to '/'
 * - Never redirects allowed/public paths (avoids loops)
 * - Works with Better Auth session API
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public paths (never redirect)
  const allowPaths = ['/'] // add more public routes if needed (e.g. '/login')

  // Skip protection for allowed paths
  if (allowPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // Fetch session from Better Auth
  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers)
  })

  if (!session) {
    console.log(`[proxy] No session on "${pathname}" → redirecting to "/"`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Session exists — continue
  return NextResponse.next()
}

// Apply middleware only to protected route groups
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
}
