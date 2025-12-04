import { NextResponse } from 'next/server'
import { db } from '@/db'

export async function GET() {
  try {
    await db.execute('select 1')

    const data = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: {
        appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
        betterAuthUrl: process.env.BETTER_AUTH_URL || null,
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL
      }
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (error) {
    const data = {
      status: 'error',
      message: 'Database connection failed',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}
