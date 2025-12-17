// src/lib/use-executor-type.ts
import { db } from '@/db'

/**
 * UserExecutor represents a Drizzle database executor.
 * This works for:
 * - db
 * - db.transaction(tx => ...)
 */
export type UserExecutor = typeof db

export {}
