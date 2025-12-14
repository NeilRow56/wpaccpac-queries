import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access'

const statements = {
  ...defaultStatements,
  project: ['create', 'read', 'update', 'delete']
} as const

export const ac = createAccessControl(statements)

export const roles = {
  user: ac.newRole({
    project: ['read']
  }),
  owner: ac.newRole({
    project: ['create', 'read', 'update', 'delete']
  }),

  admin: ac.newRole({
    project: ['create', 'read', 'update', 'delete'],
    ...adminAc.statements
  })
}

export type AuthzUser = {
  id: string
  role: 'user' | 'admin' | 'owner' | 'superuser'
  isSuperUser: boolean
}

export function canCreateOrganization(
  user: AuthzUser,
  userOrgCount: number
): boolean {
  // Superusers can always create
  if (user.isSuperUser) return true

  // Admins can only create if they have no organizations yet
  if (user.role === 'admin' && userOrgCount === 0) return true

  // Owners and regular users cannot create
  return false
}
