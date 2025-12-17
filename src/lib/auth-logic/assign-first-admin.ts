import { eq } from 'drizzle-orm'
import { user as userTable } from '@/db/schema'
import { UserExecutor } from '../use-executor-type'

export async function assignFirstAdmin(executor: UserExecutor, userId: string) {
  // READ — query is correct
  const existingAdmins = await executor.query.user.findMany({
    where: eq(userTable.role, 'admin'),
    limit: 1,
    columns: { id: true }
  })

  if (existingAdmins.length === 0) {
    // WRITE — must use update(table)
    await executor
      .update(userTable)
      .set({ role: 'admin' })
      .where(eq(userTable.id, userId))
  }
}
