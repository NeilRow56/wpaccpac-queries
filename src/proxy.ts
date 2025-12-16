// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const config = {
  matcher: [
    // Protect these route groups
    '/dashboard/:path*',
    '/admin/:path*',
    '/settings/:path*'
  ]
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ---- Create response early (important for NFT tracing) ----
  const response = NextResponse.next()

  // ---- Security headers (Edge-safe) ----
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https:",
      "connect-src 'self' https: http://localhost:3000 https://*.vercel.app",
      "frame-ancestors 'none'"
    ].join('; ')
  )

  // ---- Auth protection ----

  // Public paths that should never redirect
  const publicPaths = ['/', '/auth']

  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers)
  })

  if (!session) {
    const redirectTo = encodeURIComponent(pathname + search)
    return NextResponse.redirect(
      new URL(`/auth?redirect=${redirectTo}`, request.url)
    )
  }

  return NextResponse.next()
}
