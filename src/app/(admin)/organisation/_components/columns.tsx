'use client'

// import { CreateRowActions } from '@/components/table-components/data-table-actions'

import { ColumnDef } from '@tanstack/react-table'

export type Member = {
  id: string
  name: string
  role: 'member' | 'admin' | 'owner' | 'superUser'
  createdAt: Date
}

export const columns: ColumnDef<Member>[] = [
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'role',
    header: 'Role'
  },
  {
    accessorKey: 'createdAt',
    header: 'Date created'
  }
]
