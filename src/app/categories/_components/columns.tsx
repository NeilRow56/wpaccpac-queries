'use client'

import { CreateRowActions } from '@/components/table-components/data-table-actions'
import DataTableColumnHeader from '@/components/table-components/data-table-column-header'
import { ColumnDef } from '@tanstack/react-table'

export type Category = {
  id: number
  name: string
}
export const columns: ColumnDef<Category>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    )
  },

  CreateRowActions<Category>()
]
