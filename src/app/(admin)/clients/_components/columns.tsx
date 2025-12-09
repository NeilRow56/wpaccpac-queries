'use client'

import { CreateRowActions } from '@/components/table-components/data-table-actions'
import DataTableColumnHeader from '@/components/table-components/data-table-column-header'
import { businessTypes } from '@/db/schema'
import { ColumnDef } from '@tanstack/react-table'

export type Client = {
  id: string
  name: string
  entity_type: (typeof businessTypes)[number] // fixed
  cost_centre_name: string
  owner: string
  notes: string
  active: boolean
  // organizationId?: string
}
export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    )
  },

  CreateRowActions<Client>()
]
