'use client'

// import { CreateRowActions } from '@/components/table-components/data-table-actions'

import { ColumnDef } from '@tanstack/react-table'

// export type Organization = {
//   id: string
//   name: string
//   slug: string
// }
// export const columns: ColumnDef<Organization>[] = [
//   {
//     accessorKey: 'name',
//     header: ({ column }) => (
//       <DataTableColumnHeader column={column} title='Name' />
//     )
//   },
//   // {
//   //   accessorKey: 'slug',
//   //   header: ({ column }) => (
//   //     <DataTableColumnHeader column={column} title='Slug' />
//   //   )
//   // },

//   CreateRowActions<Organization>()
// ]

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
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
