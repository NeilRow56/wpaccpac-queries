import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import { user } from '@/db/schema'
import { assignFirstAdmin } from '../assign-first-admin'
import { eq } from 'drizzle-orm'
import { UserExecutor } from '@/lib/use-executor-type'

describe('assignFirstAdmin', () => {
  beforeEach(async () => {
    await db.delete(user)
  })

  it('makes the first user an admin', async () => {
    const id = 'user-1'

    await db.insert(user).values({
      id,
      email: 'one@test.com',
      name: 'User One'
    })

    await db.transaction(async tx => {
      const userTx = tx as unknown as UserExecutor
      await assignFirstAdmin(userTx, id)
    })

    const result = await db.query.user.findFirst({
      where: eq(user.id, id)
    })

    expect(result?.role).toBe('admin')
  })

  it('does not promote second user if admin exists', async () => {
    await db.insert(user).values([
      {
        id: 'admin',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'admin'
      },
      {
        id: 'user-2',
        email: 'two@test.com',
        name: 'User Two'
      }
    ])

    await db.transaction(async tx => {
      const userTx = tx as unknown as UserExecutor
      await assignFirstAdmin(userTx, 'user-2')
    })

    const user2 = await db.query.user.findFirst({
      where: eq(user.id, 'user-2')
    })

    expect(user2?.role).toBe('user')
  })
})
