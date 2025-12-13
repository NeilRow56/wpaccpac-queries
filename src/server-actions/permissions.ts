import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export const isAdmin = async (): Promise<boolean> => {
  try {
    const { success, error } = await auth.api.hasPermission({
      headers: await headers(),
      body: {
        permissions: {
          organization: ['update', 'delete']
        }
      }
    })

    if (error) {
      console.error('[isAdmin] permission check error', error)
      return false
    }

    return Boolean(success)
  } catch (error) {
    console.error('[isAdmin] failed', error)
    return false
  }
}
