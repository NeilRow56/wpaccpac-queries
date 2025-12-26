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
import {
  ArrowUpDown,
  Download,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar
} from 'lucide-react'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { AssetWithCalculations } from '@/lib/asset-calculations'
import { DepreciationScheduleModal } from './depreciation-schedule-modal'

interface FixedAssetsTableProps {
  assets: AssetWithCalculations[]
  onEdit?: (asset: AssetWithCalculations) => void
  onDelete?: (assetId: string) => void
}

export function FixedAssetsTable({
  assets,
  onEdit,
  onDelete
}: FixedAssetsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [selectedAsset, setSelectedAsset] =
    React.useState<AssetWithCalculations | null>(null)
  const [showScheduleModal, setShowScheduleModal] = React.useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB').format(date)
  }

  const handleViewSchedule = (asset: AssetWithCalculations) => {
    setSelectedAsset(asset)
    setShowScheduleModal(true)
  }

  const columns: ColumnDef<AssetWithCalculations>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Asset Name
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('name')}</div>
      )
    },
    {
      accessorKey: 'categoryName',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Category
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        )
      },
      cell: ({ row }) => {
        const category = row.getValue('categoryName') as string | null
        return <div className='text-muted-foreground'>{category || '—'}</div>
      }
    },
    {
      accessorKey: 'dateOfPurchase',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date of Purchase
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        )
      },
      cell: ({ row }) => formatDate(row.getValue('dateOfPurchase'))
    },
    {
      accessorKey: 'depreciationMethod',
      header: 'Method',
      cell: ({ row }) => {
        const method = row.getValue('depreciationMethod') as string
        return (
          <div className='text-sm capitalize'>{method.replace('_', ' ')}</div>
        )
      }
    },
    {
      accessorKey: 'cost',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='w-full justify-end'
          >
            Cost
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className='text-right'>{formatCurrency(row.getValue('cost'))}</div>
      )
    },
    {
      accessorKey: 'totalDepreciationToDate',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='w-full justify-end'
          >
            Total Depreciation To Date
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className='text-right'>
          {formatCurrency(row.getValue('totalDepreciationToDate'))}
        </div>
      )
    },
    {
      accessorKey: 'depreciationForPeriod',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='w-full justify-end'
          >
            Depreciation for Period
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className='text-right'>
          {formatCurrency(row.getValue('depreciationForPeriod'))}
        </div>
      )
    },
    {
      accessorKey: 'netBookValue',
      header: ({ column }) => {
        return (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='w-full justify-end'
          >
            Net Book Value
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className='text-right font-medium'>
          {formatCurrency(row.getValue('netBookValue'))}
        </div>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const asset = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-8 w-8 p-0'>
                <span className='sr-only'>Open menu</span>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewSchedule(asset)}>
                <Calendar className='mr-2 h-4 w-4' />
                View Schedule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(asset)}>
                  <Pencil className='mr-2 h-4 w-4' />
                  Edit Asset
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => {
                    if (
                      confirm(`Are you sure you want to delete ${asset.name}?`)
                    ) {
                      onDelete(asset.id)
                    }
                  }}
                  className='text-red-600'
                >
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete Asset
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
      cost: acc.cost + row.original.cost,
      totalDepreciationToDate:
        acc.totalDepreciationToDate + row.original.totalDepreciationToDate,
      depreciationForPeriod:
        acc.depreciationForPeriod + row.original.depreciationForPeriod,
      netBookValue: acc.netBookValue + row.original.netBookValue
    }),
    {
      cost: 0,
      totalDepreciationToDate: 0,
      depreciationForPeriod: 0,
      netBookValue: 0
    }
  )

  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')

    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Fixed Assets Register', 14, 22)

    doc.setFontSize(11)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 30)

    const tableData = table
      .getFilteredRowModel()
      .rows.map(row => [
        row.original.name,
        row.original.categoryName || '—',
        formatDate(row.original.dateOfPurchase),
        row.original.depreciationMethod.replace('_', ' '),
        formatCurrency(row.original.cost),
        formatCurrency(row.original.totalDepreciationToDate),
        formatCurrency(row.original.depreciationForPeriod),
        formatCurrency(row.original.netBookValue)
      ])

    tableData.push([
      'TOTAL',
      '',
      '',
      '',
      formatCurrency(totals.cost),
      formatCurrency(totals.totalDepreciationToDate),
      formatCurrency(totals.depreciationForPeriod),
      formatCurrency(totals.netBookValue)
    ])

    doc.autoTable({
      head: [
        [
          'Asset Name',
          'Category',
          'Date of Purchase',
          'Method',
          'Cost',
          'Total Depreciation',
          'Period Depreciation',
          'Net Book Value'
        ]
      ],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
        7: { cellWidth: 25, halign: 'right' }
      }
    })

    doc.save('fixed-assets-register.pdf')
  }

  const exportToExcel = async () => {
    const XLSX = await import('xlsx')

    const worksheet_data = [
      ['Fixed Assets Register'],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      [
        'Asset Name',
        'Category',
        'Date of Purchase',
        'Method',
        'Cost',
        'Total Depreciation To Date',
        'Depreciation for Period',
        'Net Book Value'
      ],
      ...table
        .getFilteredRowModel()
        .rows.map(row => [
          row.original.name,
          row.original.categoryName || '—',
          formatDate(row.original.dateOfPurchase),
          row.original.depreciationMethod.replace('_', ' '),
          row.original.cost,
          row.original.totalDepreciationToDate,
          row.original.depreciationForPeriod,
          row.original.netBookValue
        ]),
      [],
      [
        'TOTAL',
        '',
        '',
        '',
        totals.cost,
        totals.totalDepreciationToDate,
        totals.depreciationForPeriod,
        totals.netBookValue
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
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className='font-bold'>
                Total ({table.getFilteredRowModel().rows.length} assets)
              </TableCell>
              <TableCell className='text-right font-bold'>
                {formatCurrency(totals.cost)}
              </TableCell>
              <TableCell className='text-right font-bold'>
                {formatCurrency(totals.totalDepreciationToDate)}
              </TableCell>
              <TableCell className='text-right font-bold'>
                {formatCurrency(totals.depreciationForPeriod)}
              </TableCell>
              <TableCell className='text-right font-bold'>
                {formatCurrency(totals.netBookValue)}
              </TableCell>
              <TableCell></TableCell>
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
      {selectedAsset && (
        <DepreciationScheduleModal
          asset={selectedAsset}
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  )
}
