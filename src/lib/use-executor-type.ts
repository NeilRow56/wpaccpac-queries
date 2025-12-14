import { eq } from 'drizzle-orm'

export type UserExecutor = {
  query: {
    user: {
      findFirst: (args: {
        where?: ReturnType<typeof eq>
        columns?: { id?: boolean; role?: boolean; isSuperUser?: boolean }
      }) => Promise<
        Partial<{
          id: string
          role: 'user' | 'admin' | 'owner' | 'superuser'
          isSuperUser: boolean | null
        }>
      >
      findMany: (args: {
        where?: ReturnType<typeof eq>
        columns?: { id: true }
        limit?: number
      }) => Promise<{ id: string }[]>
      update: (args: {
        set: Partial<{
          role: 'user' | 'admin' | 'owner' | 'superuser'
          isSuperUser: boolean
        }>
        where?: ReturnType<typeof eq>
      }) => Promise<void>
    }
  }
}

export {}
