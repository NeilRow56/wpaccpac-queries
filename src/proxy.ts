import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/settings/:path*']
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const session = await auth.api.getSession({
    headers: Object.fromEntries(request.headers)
  })

  if (!session) {
    const redirectTo = encodeURIComponent(pathname + search)
    return NextResponse.redirect(
      new URL(`/auth?redirect=${redirectTo}`, request.url)
    )
  }

  return response
}
