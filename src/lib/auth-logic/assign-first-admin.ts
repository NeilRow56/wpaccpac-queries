// import { user } from '@/db/schema'
// import { eq } from 'drizzle-orm'
// import { UserExecutor } from '../use-executor-type'

// export async function assignFirstAdmin(tx: UserExecutor, userId: string) {
//   const existingAdmins = await tx.query.user.findMany({
//     where: eq(user.role, 'admin'),
//     limit: 1,
//     columns: { id: true }
//   })

//   if (existingAdmins.length === 0) {
//     await tx.query.user.update({
//       set: { role: 'admin' },
//       where: eq(user.id, userId)
//     })
//   }
// }

// export {}
// lib/assign-first-admin.ts
import { eq } from 'drizzle-orm'
import { user } from '@/db/schema'
import { UserExecutor } from '../use-executor-type'

export async function assignFirstAdmin(tx: UserExecutor, userId: string) {
  const existingAdmins = await tx.query.user.findMany({
    where: eq(user.role, 'admin'),
    limit: 1,
    columns: { id: true }
  })

  if (existingAdmins.length === 0) {
    await tx.query.user.update({
      set: { role: 'admin' },
      where: eq(user.id, userId)
    })
  }
}

export {}
