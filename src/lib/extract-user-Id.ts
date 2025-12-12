// src/lib/extractUserId.ts

/**
 * Safely extracts the user ID from the BetterAuth session object.
 * Handles both `session.user.id` and `session.session.userId`
 * and avoids "any" and unsafe assumptions.
 */

export function extractUserId(session: unknown): string | null {
  if (!session || typeof session !== 'object') {
    return null
  }

  const s = session as Record<string, unknown>

  //
  // Try session.user.id
  //
  const userObj = s['user']
  if (
    userObj &&
    typeof userObj === 'object' &&
    typeof (userObj as Record<string, unknown>)['id'] === 'string'
  ) {
    return (userObj as Record<string, unknown>)['id'] as string
  }

  //
  // Try session.session.userId
  //
  const innerSession = s['session']
  if (
    innerSession &&
    typeof innerSession === 'object' &&
    typeof (innerSession as Record<string, unknown>)['userId'] === 'string'
  ) {
    return (innerSession as Record<string, unknown>)['userId'] as string
  }

  return null
}
