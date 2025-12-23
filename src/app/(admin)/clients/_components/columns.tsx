'use client'

import React from 'react'
import { ColumnDef, Column } from '@tanstack/react-table'
import DataTableColumnHeader from '@/components/table-components/data-table-column-header'
import { CreateRowActions } from '@/components/table-components/data-table-actions'
import { entity_types } from '@/lib/constants'

// ----- Entity Type Setup -----
export const entityTypeMap: Record<string, string> = Object.fromEntries(
  entity_types.map(et => [et.id, et.description])
)

export const entityTypeList = entity_types.map(et => ({
  id: et.id,
  label: et.description
}))

// ----- Client Type -----
export type Client = {
  id: string
  name: string
  entity_type: string
  costCentreId: string | null // keep ID for editing
  costCentreName: string // display name in table
  organizationId: string
  notes: string
  active: boolean
}

// ----- Columns Factory -----
export const columns = (
  orgCostCentres: { id: string; name: string }[]
): ColumnDef<Client>[] => {
  const costCentreList = orgCostCentres.map(cc => ({
    id: cc.id,
    label: cc.name
  }))

  const makeDropdownFilter = <TData extends Client>(
    column: Column<TData, unknown>,
    options: { id: string; label: string }[]
  ) => {
    const filterValue = column.getFilterValue() as string | undefined
    return (
      <select
        className='rounded border p-1'
        value={filterValue ?? ''}
        onChange={e => column.setFilterValue(e.target.value || undefined)}
      >
        <option value=''>--select--</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  const ActiveFilter: React.FC<{ column: Column<Client, unknown> }> = ({
    column
  }) => {
    const filterValue = column.getFilterValue() as string | undefined
    return (
      <select
        className='rounded border p-1'
        value={filterValue ?? ''}
        onChange={e => column.setFilterValue(e.target.value || undefined)}
      >
        <option value=''>--select--</option>
        <option value='true'>Active</option>
        <option value='false'>Archived</option>
      </select>
    )
  }

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Client' />
      )
    },
    {
      accessorKey: 'entity_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Entity Type' />
      ),
      cell: ({ row }) => (
        <span>
          {entityTypeMap[row.getValue('entity_type') as string] ??
            row.getValue('entity_type')}
        </span>
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true
        const id = row.getValue(columnId) as string
        return id === filterValue
      },
      meta: {
        filterComponent: ({ column }) =>
          makeDropdownFilter(column, entityTypeList)
      }
    },
    {
      accessorKey: 'costCentreName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Cost Centre' />
      ),
      cell: ({ row }) => (
        <span>{row.getValue('costCentreName') ?? 'Unknown'}</span>
      ),
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true
        const value = row.getValue(columnId) as string | null
        return value === filterValue
      },
      meta: {
        filterComponent: ({ column }) =>
          makeDropdownFilter(column, costCentreList)
      }
    },
    {
      accessorKey: 'active',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => {
        const active = row.getValue('active') as boolean
        return (
          <span className={active ? '' : 'text-red-600'}>
            {active ? 'Active' : 'Archived'}
          </span>
        )
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true
        const active = row.getValue(columnId) as boolean
        return String(active) === filterValue
      },
      meta: {
        filterComponent: ActiveFilter
      }
    },
    CreateRowActions<Client>()
  ]
}
