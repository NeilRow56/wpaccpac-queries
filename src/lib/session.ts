import { auth } from './auth'
import { headers } from 'next/headers'

export async function getSessionServer() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  return session // session is either null or the session object
}
