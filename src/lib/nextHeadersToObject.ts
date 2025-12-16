import { headers } from 'next/headers'

/**
 * Convert Next.js App Router headers to a plain object
 * suitable for libraries that expect HeadersInit
 */
export async function nextHeadersToObject(): Promise<Record<string, string>> {
  const h = await headers() // Now async!
  const result: Record<string, string> = {}
  h.forEach((value, key) => {
    result[key] = value
  })
  return result
}
