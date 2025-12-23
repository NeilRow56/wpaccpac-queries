// app/protected/user-table.tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getAllUsersAdmin } from '@/server-actions/users'
import { UserArchiveMenu } from './userArchiveMenu'
import type { AdminOrganizationUser } from '@/server-actions/organizations'

import { SortButton } from './sort-button'
import { roleBadgeClass } from '@/lib/color-switcher'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 10

export async function UserTable({
  searchParams
}: {
  searchParams: Promise<{
    page?: string
    q?: string
    sort?: string
    dir?: string
  }>
}) {
  // 🔑 Next.js 16: must await
  const params = await searchParams

  const page = Math.max(1, Number(params.page ?? 1))
  const query = params.q?.trim() ?? ''
  const sort = (params.sort as 'name' | 'email' | 'organization') ?? 'name'
  const dir = (params.dir as 'asc' | 'desc') ?? 'asc'

  // 📦 Fetch filtered + paginated data
  const { users, total } = await getAllUsersAdmin({
    page,
    pageSize: PAGE_SIZE,
    search: query,
    sort,
    dir
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      {/* 🔍 Search */}
      <form className='mb-12 flex gap-2'>
        <input
          name='q'
          defaultValue={query}
          placeholder='Search users…'
          className='w-64 rounded border px-3 py-2 text-sm'
        />

        <Button type='submit'>Search</Button>
      </form>

      <Table>
        <TableCaption className='text-lg font-semibold'>
          <span className='text-primary'>
            {' '}
            All users across all organisations
          </span>
        </TableCaption>
        <TableCaption className='text-lg font-semibold'>
          <span className='text-muted-foreground text-sm'>
            {' '}
            To refresh search clear input and press search
          </span>
        </TableCaption>

        <TableHeader>
          <TableRow>
            <TableHead className='text-primary font-bold'>ID</TableHead>
            <TableHead className='text-primary font-bold'>
              <SortButton label='Name' sortKey='name' />
            </TableHead>
            <TableHead className='text-primary font-bold'>
              <SortButton label='Email' sortKey='email' />
            </TableHead>
            <TableHead className='text-primary font-bold'>
              <SortButton label='Organisation' sortKey='organization' />
            </TableHead>

            <TableHead className='text-primary font-bold'>Org Role</TableHead>
            <TableHead className='text-primary font-bold'>Super User</TableHead>
            <TableHead className='text-primary font-bold'>Archived</TableHead>
            <TableHead className='text-primary text-right font-bold'>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.map((user: AdminOrganizationUser) => (
            <TableRow key={`${user.id}-${user.organizationId}`}>
              <TableCell className='font-medium'>
                {user.id.slice(0, 8)}
              </TableCell>

              <TableCell>{user.name ?? '—'}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.organizationName}</TableCell>
              <TableCell>
                <Badge className={roleBadgeClass(user.orgRole)}>
                  {user.orgRole}
                </Badge>
              </TableCell>
              <TableCell>{user.isSuperUser ? 'Yes' : 'No'}</TableCell>

              <TableCell>
                {user.archivedAt ? (
                  <span className='text-red-500'>
                    {user.archivedAt
                      ? user.archivedAt.toLocaleDateString('en-GB')
                      : '—'}
                  </span>
                ) : (
                  '—'
                )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex justify-end gap-2 pt-4'>
          <Button asChild variant='outline' disabled={page <= 1}>
            <Link href={`?page=${page - 1}&q=${query}`}>Previous</Link>
          </Button>

          <span className='px-2 text-sm'>
            Page {page} of {totalPages}
          </span>

          <Button asChild variant='outline' disabled={page >= totalPages}>
            <Link href={`?page=${page + 1}&q=${query}`}>Next</Link>
          </Button>
        </div>
      )}
    </>
  )
}
