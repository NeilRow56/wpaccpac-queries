// lib/assign-first-admin.ts
import { eq } from 'drizzle-orm'
import { user as userTable, member } from '@/db/schema'
import { UserExecutor } from '../use-executor-type'

export async function assignFirstAdmin(
  executor: UserExecutor,
  userId: string,
  organizationId: string
) {
  // Check if any admin exists for this organization
  const orgAdmins = await executor.query.user.findMany({
    where: eq(member.organizationId, organizationId), // join via membership table
    columns: { id: true },
    limit: 1
  })

  if (orgAdmins.length === 0) {
    // Assign this user as admin for the org
    await executor
      .update(userTable)
      .set({ role: 'admin' })
      .where(eq(userTable.id, userId))
  }
}
