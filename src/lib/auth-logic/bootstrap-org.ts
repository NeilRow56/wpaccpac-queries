// canCreateOrganization(user, appState)

// canInviteMembers(memberRole)

// user.role !== organizationMember.role
// src/lib/bootstrap-org.ts

/**
 * Determines if a user can create a new organization.
 * Only allows if:
 *  - User is a superuser or admin
 *  - For the first organization, ensures "bootstrap lock"
 */
export function canCreateOrganization(
  user: { role: 'superuser' | 'admin' | 'user' },
  currentOrgCount: number
): boolean {
  if (!user) return false

  // Only allow first organization to be created by superuser/admin
  if (currentOrgCount === 0) {
    return user.role === 'superuser' || user.role === 'admin'
  }

  // Subsequent organizations could have more complex logic (optional)
  return false
}

/**
 * Determines if a member can invite new members to the organization.
 * Only owners and admins can invite.
 */
export function canInviteMembers(
  memberRole: 'owner' | 'admin' | 'member'
): boolean {
  return memberRole === 'owner' || memberRole === 'admin'
}

/**
 * Maps the global user.role to organization member.role.
 * Ensures internal consistency between user and membership permissions.
 */
export function mapUserRoleToMemberRole(
  userRole: 'superuser' | 'admin' | 'user'
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
 * Optional: helper to check if user can perform any admin-level actions
 * within an organization (update org, delete org, manage members, etc)
 */
export function canPerformOrgAdminActions(
  memberRole: 'owner' | 'admin' | 'member'
): boolean {
  return memberRole === 'owner' || memberRole === 'admin'
}
