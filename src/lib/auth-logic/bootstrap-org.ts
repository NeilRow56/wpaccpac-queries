// src/lib/auth-logic/bootstrap-org.ts

import { getUISession } from '../get-ui-session'

/**
 * Determines if the currently authenticated user
 * can create a new organization.
 *
 * 🔐 Single source of truth:
 * Delegates entirely to ui.canCreateOrganization
 */
export async function canCreateOrganization(): Promise<boolean> {
  const { user, ui } = await getUISession()

  if (!user) return false

  return ui.canCreateOrganization
}

/**
 * Determines if a member can invite new members to an organization.
 * Only owners and admins can invite.
 */
export function canInviteMembers(
  memberRole: 'owner' | 'admin' | 'member'
): boolean {
  return memberRole === 'owner' || memberRole === 'admin'
}

/**
 * Maps a global user.role to an organization member.role.
 * Used when bootstrapping or adding members.
 */
export function mapUserRoleToMemberRole(
  userRole: 'superuser' | 'admin' | 'owner' | 'user'
): 'owner' | 'admin' | 'member' {
  switch (userRole) {
    case 'superuser':
      return 'owner'
    case 'admin':
      return 'admin'
    default:
      return 'member'
  }
}

/**
 * Checks whether a member can perform organization-level admin actions
 * (update org, manage members, etc).
 */
export function canPerformOrgAdminActions(
  memberRole: 'owner' | 'admin' | 'member'
): boolean {
  return memberRole === 'owner' || memberRole === 'admin'
}
