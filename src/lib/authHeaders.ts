// src/lib/authHeaders.ts
import { headers } from 'next/headers'

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const h = await headers()
  const cookie = h.get('cookie')

  return cookie ? { cookie } : {}
}
