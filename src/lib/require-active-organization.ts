// lib/require-organization.ts
import { getUISession } from './get-ui-session'
import { redirect } from 'next/navigation'

export async function requireActiveOrganization() {
  const { session, user, ui } = await getUISession()

  if (!user) {
    redirect('/auth') // user not logged in
  }

  const organizationId = session?.activeOrganizationId

  if (!organizationId) {
    throw new Error('No active organization found for this user.')
  }

  return { organizationId, user, ui }
}
