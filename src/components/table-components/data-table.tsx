'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Column,
  RowData
} from '@tanstack/react-table'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuContent
} from '@/components/ui/dropdown-menu'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

import { PaginationMobileFriendly } from './data-table-pagination'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    filterComponent?: React.FC<{ column: Column<TData, TValue> }>
  }

  interface TableMeta<TData extends RowData> {
    onDelete?: (item: TData) => void
    onEdit?: (item: TData) => void
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowDelete?: (item: TData) => void
  onRowEdit?: (item: TData) => void
  columnFilters?: ColumnFiltersState
  setColumnFilters?: React.Dispatch<React.SetStateAction<ColumnFiltersState>>
}

export function DataTable<TData extends RowData, TValue>({
  columns,
  data,
  onRowDelete,
  onRowEdit,
  columnFilters,
  setColumnFilters
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [internalFilters, setInternalFilters] =
    React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const filtersToUse = columnFilters ?? internalFilters
  const setFiltersToUse = setColumnFilters ?? setInternalFilters

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters: filtersToUse,
      columnVisibility,
      rowSelection,
      pagination
    },
    meta: {
      onDelete: onRowDelete,
      onEdit: onRowEdit
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFiltersToUse,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const renderDefaultFilter = (column: Column<TData, unknown>) => (
    <Input
      placeholder={`Filter ${column.id}...`}
      value={(column.getFilterValue() as string) ?? ''}
      onChange={e => column.setFilterValue(e.target.value)}
      className='mb-1 h-8 max-w-sm border-red-200'
    />
  )

  return (
    <div className='space-y-6'>
      {/* Toolbar: Columns + Clear Filters */}
      <div className='flex items-center px-6 py-4'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline'>Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {table
              .getAllColumns()
              .filter(col => col.getCanHide())
              .map(col => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={v => col.toggleVisibility(!!v)}
                  className='capitalize'
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant='outline'
          className='ml-2'
          onClick={() => table.resetColumnFilters()}
        >
          Clear Filters
        </Button>
      </div>

      {/* Table */}
      <div className='overflow-hidden rounded-md border p-2'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className='border-primary border-b p-2 font-bold text-blue-600'
                  >
                    {header.isPlaceholder ? null : (
                      <>
                        <div className='font-bold text-blue-600'>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                        {header.column.getCanFilter() && (
                          <div className='pt-2'>
                            {header.column.columnDef.meta?.filterComponent
                              ? flexRender(
                                  header.column.columnDef.meta.filterComponent,
                                  {
                                    column: header.column
                                  }
                                )
                              : renderDefaultFilter(header.column)}
                          </div>
                        )}
                      </>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer / Pagination */}
      <div className='flex w-full items-center px-6'>
        <div className='text-muted-foreground flex-1 text-sm'>
          {table.getFilteredRowModel().rows.length} row(s)
        </div>

        <div className='flex flex-1 justify-end py-4'>
          <PaginationMobileFriendly
            table={table}
            pagination={pagination}
            setPagination={setPagination}
          />
        </div>
      </div>
    </div>
  )
}
