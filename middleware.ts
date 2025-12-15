import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    /*
     * Apply to all routes except:
     * - Next.js internals
     * - static files
     * - Better-Auth routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth/.*).*)'
  ]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_req: NextRequest) {
  const res = NextResponse.next()

  /* --------------------------------
     Basic security headers
  -------------------------------- */

  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-DNS-Prefetch-Control', 'off')

  /* --------------------------------
     Permissions Policy (safe default)
  -------------------------------- */

  res.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()'
    ].join(', ')
  )

  /* --------------------------------
     HSTS (ONLY in production)
     Edge-safe
  -------------------------------- */

  if (process.env.NODE_ENV === 'production') {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  /* --------------------------------
     Content Security Policy
     (Edge-safe + Better-Auth safe)
  -------------------------------- */

  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https:",
      "connect-src 'self' https://*.vercel.app https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  )

  return res
}
