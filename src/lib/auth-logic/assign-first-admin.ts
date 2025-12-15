import { eq } from 'drizzle-orm'
import { user as userTable } from '@/db/schema'
import { UserExecutor } from '../use-executor-type'

export async function assignFirstAdmin(tx: UserExecutor, userId: string) {
  const existingAdmins = await tx.query.user.findMany({
    where: eq(userTable.role, 'admin'),
    limit: 1,
    columns: { id: true }
  })

  if (existingAdmins.length === 0) {
    await tx.query.user.update({
      set: { role: 'admin' },
      where: eq(userTable.id, userId)
    })
  }
}

export {}
