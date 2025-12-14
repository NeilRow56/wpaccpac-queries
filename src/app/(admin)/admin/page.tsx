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
import { findAllUsers } from '@/server-actions/users'
import { requireSession } from '@/lib/requireSession'
import { extractUserId } from '@/lib/extract-user-Id'
import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { user } from '@/db/schema'

export default async function AdminPage() {
  // 1️⃣ Require session
  const session = await requireSession({
    redirectTo: '/auth'
  })

  // 2️⃣ Extract user id
  const userId = extractUserId(session)
  if (!userId) redirect('/auth')

  // 3️⃣ Load authoritative DB user
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      id: true,
      isSuperUser: true
    }
  })

  if (!dbUser || dbUser.isSuperUser !== true) {
    redirect('/auth')
  }

  const users = await findAllUsers()

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
                  <UserRow key={user.id} user={user} selfId={userId} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
