// components/fixed-assets-table.tsx
'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
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

import { DepreciationScheduleModal } from './depreciation-schedule-modal'
import { AssetWithPeriodCalculations } from '@/lib/types/fixed-assets'

export interface FixedAssetsTableProps {
  assets: AssetWithPeriodCalculations[]
  onEdit?: (asset: AssetWithPeriodCalculations) => void
  onDelete?: (asset: AssetWithPeriodCalculations) => void
  onRowClick?: (asset: AssetWithPeriodCalculations) => void
}

export function FixedAssetsTable({
  assets,
  onEdit,
  onDelete,
  onRowClick
}: FixedAssetsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [selectedAsset, setSelectedAsset] =
    React.useState<AssetWithPeriodCalculations | null>(null)
  const [showScheduleModal, setShowScheduleModal] = React.useState(false)

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-GB').format(new Date(date))
  }

  const handleViewSchedule = (asset: AssetWithPeriodCalculations) => {
    setSelectedAsset(asset)
    setShowScheduleModal(true)
  }

  const columns: ColumnDef<AssetWithPeriodCalculations>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className='text-primary text-left font-bold'>Asset</div>
      ),
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('name')}</div>
      )
    },
    {
      accessorKey: 'category.name',
      header: () => (
        <div className='text-primary text-left font-bold'>Category</div>
      ),
      cell: ({ row }) => row.original.category?.name ?? '—'
    },
    {
      accessorKey: 'dateOfPurchase',
      header: () => (
        <div className='text-primary text-left font-bold'>Purchase date</div>
      ),
      cell: ({ row }) => formatDate(row.original.dateOfPurchase)
    },
    {
      accessorKey: 'openingNBV',

      header: () => (
        <div className='text-primary text-right font-bold'>Opening NBV (£)</div>
      ),
      cell: ({ row }) => (
        <div className='text-right'>
          {formatNumber(row.original.openingNBV)}
        </div>
      )
    },
    {
      accessorKey: 'depreciationForPeriod',
      header: () => (
        <div className='text-primary text-right font-bold'>
          Depreciation (£)
        </div>
      ),
      cell: ({ row }) => (
        <div className='text-right'>
          {formatNumber(row.original.depreciationForPeriod)}
        </div>
      )
    },
    {
      accessorKey: 'closingNBV',
      header: () => (
        <div className='text-primary text-right font-bold'>Closing NBV (£)</div>
      ),
      cell: ({ row }) => (
        <div className='text-right font-medium'>
          {formatNumber(row.original.closingNBV)}
        </div>
      )
    },
    {
      id: 'actions',
      header: () => (
        <div className='text-left font-bold text-blue-600'>Actions</div>
      ),
      cell: ({ row }) => {
        // const asset = row.original

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
                onClick={() => {
                  // future: open depreciation schedule modal
                }}
              >
                View depreciation
              </DropdownMenuItem>

              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
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
      }
    }
  ]

  const table = useReactTable({
    data: assets,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 20
      }
    }
  })

  // Calculate totals from filtered rows
  const totals = table.getFilteredRowModel().rows.reduce(
    (acc, row) => ({
      openingNBV: acc.openingNBV + row.original.openingNBV,
      depreciation: acc.depreciation + row.original.depreciationForPeriod,
      closingNBV: acc.closingNBV + row.original.closingNBV
    }),
    { openingNBV: 0, depreciation: 0, closingNBV: 0 }
  )

  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')

    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Fixed Assets Register', 14, 22)

    doc.setFontSize(11)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 30)

    const tableData = table
      .getFilteredRowModel()
      .rows.map(row => [
        row.original.name,
        row.original.category?.name ?? '—',
        formatDate(row.original.dateOfPurchase),
        formatCurrency(row.original.openingNBV),
        formatCurrency(row.original.depreciationForPeriod),
        formatCurrency(row.original.closingNBV)
      ])

    tableData.push([
      'TOTAL',
      '',
      '',
      formatCurrency(totals.openingNBV),
      formatCurrency(totals.depreciation),
      formatCurrency(totals.closingNBV)
    ])

    // ✅ THIS is the key change
    autoTableModule.default(doc, {
      head: [
        [
          'Asset',
          'Category',
          'Purchased',
          'Opening NBV',
          'Depreciation',
          'Closing NBV'
        ]
      ],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    })

    doc.save('fixed-assets-register.pdf')
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
          formatDate(row.original.dateOfPurchase),
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
      { wch: 25 },
      { wch: 25 },
      { wch: 20 }
    ]

    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }]

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
            onValueChange={value => {
              table.setPageSize(Number(value))
            }}
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
          <TableHeader className=''>
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
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter className='bg-gray-100'>
            <TableRow>
              <TableCell colSpan={3} className='font-bold'>
                Totals (£)
              </TableCell>
              <TableCell className='text-right font-bold'>
                {formatNumber(totals.openingNBV)}
              </TableCell>
              <TableCell className='text-right font-bold'>
                {formatNumber(totals.depreciation)}
              </TableCell>
              <TableCell className='text-right font-bold'>
                {formatNumber(totals.closingNBV)}
              </TableCell>
              <TableCell />
            </TableRow>
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

      {/* Depreciation Schedule Modal */}
      {/* {selectedAsset && (
        <DepreciationScheduleModal
          asset={selectedAsset}
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
        />
      )} */}
    </div>
  )
}
