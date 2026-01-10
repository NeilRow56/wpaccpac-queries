'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Table as TanstackTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { Download, Search, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { formatGBP } from '@/lib/number-formatter'
import { exportTableToPDF } from '@/lib/pdf/export-table-to-pdf'
import { AssetWithPeriodCalculations } from '@/lib/asset-calculations'

export interface FixedAssetsTableProps {
  assets: AssetWithPeriodCalculations[]
  onEdit?: (asset: AssetWithPeriodCalculations) => void
  onDelete?: (asset: AssetWithPeriodCalculations) => void
  onRowClick?: (asset: AssetWithPeriodCalculations) => void
  onViewSchedule: (asset: AssetWithPeriodCalculations) => void
}

const EPS = 0.00001

function sumFiltered<TData>(
  table: TanstackTable<TData>,
  pick: (row: TData) => number
) {
  return table
    .getFilteredRowModel()
    .rows.reduce((acc, r) => acc + (pick(r.original) || 0), 0)
}

export function FixedAssetsTable({
  assets,
  onEdit,
  onDelete,
  onRowClick,
  onViewSchedule
}: FixedAssetsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [globalFilter, setGlobalFilter] = React.useState('')

  // Column visibility (used for conditional disclosure)
  const [columnVisibility, setColumnVisibility] = React.useState<
    Record<string, boolean>
  >({})

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-GB').format(new Date(date))
  }

  const columns: ColumnDef<AssetWithPeriodCalculations>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: () => (
          <div className='text-primary text-left font-bold'>Asset</div>
        ),
        cell: ({ row }) => (
          <div className='font-medium'>{row.getValue('name')}</div>
        ),
        footer: () => <div className='font-bold'>Totals (£)</div>
      },
      {
        accessorKey: 'category.name',
        header: () => (
          <div className='text-primary text-left font-bold'>Category</div>
        ),
        cell: ({ row }) => row.original.category?.name ?? '—',
        footer: () => null
      },
      {
        accessorKey: 'acquisitionDate',
        header: () => (
          <div className='text-primary text-left font-bold'>Purchase date</div>
        ),
        cell: ({ row }) => formatDate(row.original.acquisitionDate),
        footer: () => null
      },

      // ---------------- COST ----------------
      {
        accessorKey: 'openingCost',
        header: () => (
          <div className='text-primary text-right font-bold'>
            Cost b/fwd (£)
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.openingCost))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(sumFiltered(table, a => Number(a.openingCost)))}
          </div>
        )
      },
      {
        accessorKey: 'costAdjustmentForPeriod',
        header: () => (
          <div className='text-primary text-right font-bold'>
            Adjustment (£)
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.costAdjustmentForPeriod))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(
              sumFiltered(table, a => Number(a.costAdjustmentForPeriod))
            )}
          </div>
        )
      },

      {
        accessorKey: 'additionsAtCost',
        header: () => (
          <div className='text-primary text-right font-bold'>Additions (£)</div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.additionsAtCost))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(sumFiltered(table, a => Number(a.additionsAtCost)))}
          </div>
        )
      },
      {
        accessorKey: 'disposalsAtCost',
        header: () => (
          <div className='text-primary text-right font-bold'>Disposals (£)</div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.disposalsAtCost))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(sumFiltered(table, a => Number(a.disposalsAtCost)))}
          </div>
        )
      },
      {
        accessorKey: 'closingCost',
        header: () => (
          <div className='text-primary text-right font-bold'>
            Cost c/fwd (£)
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.closingCost))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(sumFiltered(table, a => Number(a.closingCost)))}
          </div>
        )
      },

      // ------------- DEPRECIATION -------------
      {
        accessorKey: 'openingAccumulatedDepreciation',
        header: () => (
          <div className='text-primary text-right font-bold'>
            Dep&apos;n b/fwd (£)
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.openingAccumulatedDepreciation))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(
              sumFiltered(table, a => Number(a.openingAccumulatedDepreciation))
            )}
          </div>
        )
      },
      {
        accessorKey: 'depreciationForPeriod',
        header: () => (
          <div className='text-primary text-right font-bold'>Charge (£)</div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.depreciationForPeriod))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(
              sumFiltered(table, a => Number(a.depreciationForPeriod))
            )}
          </div>
        )
      },
      {
        accessorKey: 'depreciationOnDisposals',
        header: () => (
          <div className='text-primary text-right font-bold'>Disposals (£)</div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.depreciationOnDisposals))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(
              sumFiltered(table, a => Number(a.depreciationOnDisposals))
            )}
          </div>
        )
      },
      {
        accessorKey: 'closingAccumulatedDepreciation',
        header: () => (
          <div className='text-primary text-right font-bold'>
            Dep&apos;n c/fwd (£)
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.closingAccumulatedDepreciation))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(
              sumFiltered(table, a => Number(a.closingAccumulatedDepreciation))
            )}
          </div>
        )
      },

      // ---------------- NBV ----------------
      {
        accessorKey: 'openingNBV',
        header: () => (
          <div className='text-primary text-right font-bold'>
            Opening NBV (£)
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-right'>
            {formatNumber(Number(row.original.openingNBV))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(sumFiltered(table, a => Number(a.openingNBV)))}
          </div>
        )
      },
      {
        accessorKey: 'closingNBV',
        header: () => (
          <div className='text-primary text-right font-bold'>
            Closing NBV (£)
          </div>
        ),
        cell: ({ row }) => (
          <div className='text-right font-medium'>
            {formatNumber(Number(row.original.closingNBV))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatNumber(sumFiltered(table, a => Number(a.closingNBV)))}
          </div>
        )
      },

      // ---------------- ACTIONS ----------------
      {
        id: 'actions',
        header: () => (
          <div className='text-left font-bold text-blue-600'>Actions</div>
        ),
        cell: ({ row }) => {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  className='h-8 w-8 p-0'
                  onClick={e => e.stopPropagation()}
                >
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  className='text-blue-600'
                  onClick={e => {
                    e.stopPropagation()
                    onViewSchedule(row.original)
                  }}
                >
                  View depreciation
                </DropdownMenuItem>

                {onEdit && (
                  <DropdownMenuItem
                    onClick={e => {
                      e.stopPropagation()
                      onEdit?.(row.original)
                    }}
                  >
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit
                  </DropdownMenuItem>
                )}

                {onDelete && (
                  <DropdownMenuItem
                    className='text-red-600'
                    onClick={() => onDelete(row.original)}
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        footer: () => null
      }
    ],

    [onEdit, onDelete, onViewSchedule]
  )

  const table = useReactTable<AssetWithPeriodCalculations>({
    data: assets,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility
    },
    initialState: {
      pagination: { pageSize: 20 }
    }
  })

  // ---- Conditional disclosure: hide numeric columns when total == 0 (filtered view) ----
  React.useEffect(() => {
    const rows = table.getFilteredRowModel().rows

    const totalsById: Record<string, number> = {
      openingCost: rows.reduce((a, r) => a + Number(r.original.openingCost), 0),
      costAdjustmentForPeriod: rows.reduce(
        (a, r) => a + Number(r.original.costAdjustmentForPeriod),
        0
      ),
      additionsAtCost: rows.reduce(
        (a, r) => a + Number(r.original.additionsAtCost),
        0
      ),
      disposalsAtCost: rows.reduce(
        (a, r) => a + Number(r.original.disposalsAtCost),
        0
      ),
      closingCost: rows.reduce((a, r) => a + Number(r.original.closingCost), 0),

      openingAccumulatedDepreciation: rows.reduce(
        (a, r) => a + Number(r.original.openingAccumulatedDepreciation),
        0
      ),
      depreciationForPeriod: rows.reduce(
        (a, r) => a + Number(r.original.depreciationForPeriod),
        0
      ),
      depreciationOnDisposals: rows.reduce(
        (a, r) => a + Number(r.original.depreciationOnDisposals),
        0
      ),
      closingAccumulatedDepreciation: rows.reduce(
        (a, r) => a + Number(r.original.closingAccumulatedDepreciation),
        0
      ),

      openingNBV: rows.reduce((a, r) => a + Number(r.original.openingNBV), 0),
      closingNBV: rows.reduce((a, r) => a + Number(r.original.closingNBV), 0)
    }

    const alwaysShow = new Set<string>([
      'openingCost',
      'closingCost',
      'openingAccumulatedDepreciation',
      'depreciationForPeriod',
      'closingAccumulatedDepreciation',
      'openingNBV',
      'closingNBV'
    ])

    const nextVisibility: Record<string, boolean> = {}
    for (const [id, total] of Object.entries(totalsById)) {
      nextVisibility[id] = alwaysShow.has(id) ? true : Math.abs(total) > EPS
    }

    setColumnVisibility(prev => ({ ...prev, ...nextVisibility }))
  }, [table])

  // Totals for exports (keep your minimal set for now)
  const totals = table.getFilteredRowModel().rows.reduce(
    (acc, row) => ({
      openingNBV: acc.openingNBV + row.original.openingNBV,
      depreciation: acc.depreciation + row.original.depreciationForPeriod,
      closingNBV: acc.closingNBV + row.original.closingNBV
    }),
    { openingNBV: 0, depreciation: 0, closingNBV: 0 }
  )

  const exportToPDF = async () => {
    await exportTableToPDF<AssetWithPeriodCalculations>({
      title: 'Fixed Assets Register',
      subtitle: `Period ending ${new Date().toLocaleDateString('en-GB')}`,
      fileName: 'fixed-assets-register.pdf',
      columns: [
        { header: 'Asset', accessor: a => a.name, width: 35 },
        {
          header: 'Category',
          accessor: a => a.category?.name ?? '—',
          width: 22
        },
        {
          header: 'Purchased',
          accessor: a => formatDate(a.acquisitionDate),
          width: 22
        },
        {
          header: 'Opening NBV (£)',
          accessor: a => formatGBP(a.openingNBV),
          align: 'right',
          width: 25
        },
        {
          header: 'Depreciation (£)',
          accessor: a => formatGBP(a.depreciationForPeriod),
          align: 'right',
          width: 25
        },
        {
          header: 'Closing NBV (£)',
          accessor: a => formatGBP(a.closingNBV),
          align: 'right',
          width: 28
        }
      ],
      rows: table.getFilteredRowModel().rows.map(r => r.original),
      totals: {
        'Opening NBV (£)': totals.openingNBV,
        'Depreciation (£)': totals.depreciation,
        'Closing NBV (£)': totals.closingNBV
      }
    })
  }

  const exportToExcel = async () => {
    const XLSX = await import('xlsx')

    const worksheet_data = [
      ['Fixed Assets Register'],
      [`Period ending: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      [
        'Asset',
        'Category',
        'Purchased',
        'Opening NBV',
        'Depreciation',
        'Closing NBV'
      ],
      ...table
        .getFilteredRowModel()
        .rows.map(row => [
          row.original.name,
          row.original.category?.name ?? '—',
          formatDate(row.original.acquisitionDate),
          row.original.openingNBV,
          row.original.depreciationForPeriod,
          row.original.closingNBV
        ]),
      [],
      [
        'TOTAL',
        '',
        '',
        totals.openingNBV,
        totals.depreciation,
        totals.closingNBV
      ]
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data)

    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 }
    ]

    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fixed Assets')
    XLSX.writeFile(workbook, 'fixed-assets-register.xlsx')
  }

  return (
    <div className='space-y-4'>
      {/* Filters and Actions */}
      <div className='flex items-center justify-between gap-4'>
        <div className='flex flex-1 items-center gap-4'>
          <div className='relative max-w-sm flex-1'>
            <Search className='text-muted-foreground absolute top-2.5 left-2 h-4 w-4' />
            <Input
              placeholder='Search all columns...'
              value={globalFilter ?? ''}
              onChange={event => setGlobalFilter(event.target.value)}
              className='pl-8'
            />
          </div>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={value => table.setPageSize(Number(value))}
          >
            <SelectTrigger className='w-[130px]'>
              <SelectValue placeholder='Page size' />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50, 100].map(pageSize => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  Show {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='flex gap-2'>
          <Button onClick={exportToExcel} variant='outline'>
            <Download className='mr-2 h-4 w-4' />
            Export Excel
          </Button>
          <Button onClick={exportToPDF} variant='outline'>
            <Download className='mr-2 h-4 w-4' />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={
                    onRowClick
                      ? 'hover:bg-muted/50 cursor-pointer transition-colors'
                      : undefined
                  }
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
                  colSpan={table.getVisibleLeafColumns().length}
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          {/* Footers align perfectly to visible columns */}
          <TableFooter className='bg-gray-100'>
            {table.getFooterGroups().map(footerGroup => (
              <TableRow key={footerGroup.id}>
                {footerGroup.headers.map(header => (
                  <TableCell key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.footer,
                          header.getContext()
                        )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFooter>
        </Table>
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <div className='text-muted-foreground text-sm'>
          Showing{' '}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}{' '}
          to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} entries
        </div>
        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className='text-sm'>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
