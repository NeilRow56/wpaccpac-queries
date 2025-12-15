import { db } from '@/db'
import { user } from '@/db/schema'
import { isNull } from 'drizzle-orm'

export function isUserArchived(user: { archivedAt: Date | null }) {
  return user.archivedAt !== null
}

export const activeUsers = () =>
  db.select().from(user).where(isNull(user.archivedAt))
