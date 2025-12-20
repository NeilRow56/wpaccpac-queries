import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

import { getAllUsersAdmin } from '@/server-actions/users'
import { Button } from '@/components/ui/button'
import { UserArchiveMenu } from './userArchiveMenu'
import type { AdminOrganizationUser } from '@/server-actions/organizations'

export async function UserTable() {
  const users = await getAllUsersAdmin()

  return (
    <Table>
      <TableCaption className='text-xl font-bold'>
        All users across all organizations
      </TableCaption>

      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead>Org Role</TableHead>
          <TableHead>Super User</TableHead>
          <TableHead>Archived</TableHead>
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {users.map((user: AdminOrganizationUser) => (
          <TableRow key={`${user.id}-${user.organizationId}`}>
            <TableCell className='font-medium'>{user.id.slice(0, 8)}</TableCell>

            <TableCell>{user.name ?? '—'}</TableCell>
            <TableCell>{user.email}</TableCell>

            <TableCell>{user.organizationName}</TableCell>
            <TableCell>{user.orgRole}</TableCell>

            <TableCell>{user.isSuperUser ? 'Yes' : 'No'}</TableCell>
            <TableCell>
              {user.archivedAt?.toLocaleDateString('en-GB')}
            </TableCell>

            <TableCell className='text-right'>
              {!user.isSuperUser ? (
                <UserArchiveMenu
                  userId={user.id}
                  isArchived={Boolean(user.archivedAt)}
                />
              ) : (
                <Button variant='ghost' disabled>
                  —
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
