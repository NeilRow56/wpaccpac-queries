'use client'

import { CreateRowActions } from '@/components/table-components/data-table-actions'
import DataTableColumnHeader from '@/components/table-components/data-table-column-header'
import { ColumnDef } from '@tanstack/react-table'

export type Organization = {
  id: string
  name: string
  slug: string
}
export const columns: ColumnDef<Organization>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    )
  },
  // {
  //   accessorKey: 'slug',
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title='Slug' />
  //   )
  // },

  CreateRowActions<Organization>()
]
