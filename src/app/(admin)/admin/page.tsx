import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserRow } from './_components/user-row'
import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { user as userTable } from '@/db/schema'

import { getOrganizationUsers } from '@/server-actions/organizations'
import { requireActiveOrganization } from '@/lib/require-active-organization'

export default async function AdminPage() {
  const { organizationId, user, ui } = await requireActiveOrganization()

  if (!user) {
    redirect('/auth')
  }

  const userId = user.id

  // 3️⃣ Load authoritative DB user
  const dbUser = await db.query.user.findFirst({
    where: eq(userTable.id, userId),
    columns: {
      id: true,
      isSuperUser: true
    }
  })

  if (!dbUser || dbUser.isSuperUser !== true) {
    redirect('/auth')
  }

  const users = await getOrganizationUsers(organizationId)

  const total = users.length

  return (
    <div className='container mx-auto my-6 px-4'>
      <Link href='/' className='mb-6 inline-flex items-center'>
        <ArrowLeft className='mr-2 size-4' />
        Back to Home
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Users ({total})
          </CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className='w-[100px]'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <UserRow
                    key={user.id}
                    user={user}
                    selfId={userId}
                    canAccessAdmin={ui.canAccessAdmin}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
