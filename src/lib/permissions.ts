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
  }),
  superuser: ac.newRole({
    project: ['create', 'read', 'update', 'delete'],
    ...adminAc.statements
  })
}

export type AuthzUser = {
  id: string
  role: 'user' | 'admin' | 'owner' | 'superuser'
  isSuperUser: boolean
}
