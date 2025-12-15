import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/auth/.*).*)']
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // --- Safe security headers ---
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // HSTS (only on production)
  if (process.env.NODE_ENV === 'production') {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  // Safe CSP that does NOT break Better-Auth
  res.headers.set(
    'Content-Security-Policy',
    `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' https:;
      connect-src 'self' https: http://localhost:3000 https://*.vercel.app;
      frame-ancestors 'none';
    `.replace(/\s+/g, ' ')
  )

  return res
}
