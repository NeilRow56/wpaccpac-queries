import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

import { Role } from '@/db/schema'

import { UserRoleSelect } from './user-role-select'
import { getAllUsersAdmin } from '@/server-actions/users'
import { Button } from '@/components/ui/button'
import { UserArchiveMenu } from './userArchiveMenu'

export async function UserTable() {
  const users = await getAllUsersAdmin()

  return (
    <Table>
      <TableCaption className='text-xl font-bold'>
        A list of your users.
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className='w-[100px]'>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>

          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell className='font-medium'>{user.id.slice(0, 8)}</TableCell>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>

            <TableCell>
              <UserRoleSelect userId={user.id} role={user.role as Role} />
            </TableCell>

            <TableCell className='space-x-2 text-right'>
              {user.isSuperUser !== true ? (
                <UserArchiveMenu
                  userId={user.id}
                  isArchived={Boolean(user.archivedAt)}
                />
              ) : (
                <Button
                  variant='ghost'
                  className='mr-2 cursor-pointer'
                ></Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
