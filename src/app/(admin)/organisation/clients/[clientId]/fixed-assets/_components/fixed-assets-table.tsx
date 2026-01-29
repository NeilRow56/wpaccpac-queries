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
import {
  Download,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package
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
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { exportTableToPDF } from '@/lib/pdf/export-table-to-pdf'
import { AssetWithPeriodCalculations } from '@/lib/asset-calculations'

export interface FixedAssetsTableProps {
  assets: AssetWithPeriodCalculations[]

  // ✅ report context (optional but recommended)
  periodLabel?: string // e.g. "Apr 2025" or "Year ended 31 Mar 2025"
  clientName?: string // e.g. "ABC Ltd"
  reportSubtitle?: string // optional extra line, e.g. "Fixed assets register (summary)"

  onEdit?: (asset: AssetWithPeriodCalculations) => void
  onDelete?: (asset: AssetWithPeriodCalculations) => void
  onRowClick?: (asset: AssetWithPeriodCalculations) => void
  onViewSchedule: (asset: AssetWithPeriodCalculations) => void
  onPostMovement?: (asset: AssetWithPeriodCalculations) => void
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

const formatWholeGBP = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 0
  }).format(Math.round(Number(value) || 0))

const formatDisposal = (value: number) => {
  const n = Number(value) || 0
  if (n === 0) return '0'
  return `(${formatWholeGBP(n)})`
}

export function FixedAssetsTable({
  assets,
  periodLabel,
  clientName,
  reportSubtitle,
  onEdit,
  onDelete,
  onRowClick,
  onViewSchedule,
  onPostMovement // ✅
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

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-GB').format(new Date(date))
  }

  const COST_CUTOFF = 1 // group “disposed” (or ~fully disposed) at the end

  const sortedAssets = React.useMemo(() => {
    const toTime = (d: Date | string | null | undefined) => {
      if (!d) return 0
      const t = new Date(d).getTime()
      return Number.isFinite(t) ? t : 0
    }

    const toNum = (v: unknown) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }

    return [...assets].sort((a, b) => {
      const aClosing = toNum(a.closingCost)
      const bClosing = toNum(b.closingCost)

      const aDisposed = aClosing < COST_CUTOFF
      const bDisposed = bClosing < COST_CUTOFF

      // 1) Active assets first, disposed last
      if (aDisposed !== bDisposed) return aDisposed ? 1 : -1

      // 2) Within each group: acquisition date DESC
      return toTime(b.acquisitionDate) - toTime(a.acquisitionDate)
    })
  }, [assets])

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
            {formatWholeGBP(Number(row.original.openingCost))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(sumFiltered(table, a => Number(a.openingCost)))}
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
            {formatWholeGBP(Number(row.original.costAdjustmentForPeriod))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(
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
            {formatWholeGBP(Number(row.original.additionsAtCost))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(sumFiltered(table, a => Number(a.additionsAtCost)))}
          </div>
        )
      },
      {
        accessorKey: 'disposalsAtCost',
        header: () => (
          <div className='text-primary text-right font-bold'>Disposals (£)</div>
        ),
        cell: ({ row }) => (
          <div className='text-right text-red-600'>
            {formatDisposal(Number(row.original.disposalsAtCost))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold text-red-600'>
            {formatDisposal(sumFiltered(table, a => Number(a.disposalsAtCost)))}
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
            {formatWholeGBP(Number(row.original.closingCost))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(sumFiltered(table, a => Number(a.closingCost)))}
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
            {formatWholeGBP(
              Number(row.original.openingAccumulatedDepreciation)
            )}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(
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
            {formatWholeGBP(Number(row.original.depreciationForPeriod))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(
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
          <div className='text-right text-red-600'>
            {formatDisposal(Number(row.original.depreciationOnDisposals))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold text-red-600'>
            {formatDisposal(
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
            {formatWholeGBP(
              Number(row.original.closingAccumulatedDepreciation)
            )}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(
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
            {formatWholeGBP(Number(row.original.openingNBV))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(sumFiltered(table, a => Number(a.openingNBV)))}
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
            {formatWholeGBP(Number(row.original.closingNBV))}
          </div>
        ),
        footer: ({ table }) => (
          <div className='text-right font-bold'>
            {formatWholeGBP(sumFiltered(table, a => Number(a.closingNBV)))}
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

                {onPostMovement &&
                  (() => {
                    const isFullyDisposed =
                      Number(row.original.closingCost) <= 0.01

                    return (
                      <DropdownMenuItem
                        disabled={isFullyDisposed}
                        onClick={e => {
                          e.stopPropagation()
                          if (!isFullyDisposed) {
                            onPostMovement(row.original)
                          }
                        }}
                        title={
                          isFullyDisposed
                            ? 'This asset has been fully disposed in the current period'
                            : undefined
                        }
                        className={
                          isFullyDisposed
                            ? 'cursor-not-allowed opacity-50'
                            : undefined
                        }
                      >
                        Dispose / Revalue / Adj.
                      </DropdownMenuItem>
                    )
                  })()}

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
                    onClick={e => {
                      e.stopPropagation()
                      onDelete(row.original)
                    }}
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

    [onEdit, onDelete, onViewSchedule, onPostMovement]
  )

  const table = useReactTable<AssetWithPeriodCalculations>({
    data: sortedAssets,
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
      pagination: { pageSize: 10 }
    }
  })

  // ---- Conditional disclosure: hide numeric columns when total == 0 (filtered view) ----

  const n0 = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  React.useEffect(() => {
    const rows = table.getFilteredRowModel().rows

    const totalsById: Record<string, number> = {
      openingCost: rows.reduce((a, r) => a + n0(r.original.openingCost), 0),
      costAdjustmentForPeriod: rows.reduce(
        (a, r) => a + n0(r.original.costAdjustmentForPeriod),
        0
      ),
      additionsAtCost: rows.reduce(
        (a, r) => a + n0(r.original.additionsAtCost),
        0
      ),
      disposalsAtCost: rows.reduce(
        (a, r) => a + n0(r.original.disposalsAtCost),
        0
      ),
      closingCost: rows.reduce((a, r) => a + n0(r.original.closingCost), 0),

      openingAccumulatedDepreciation: rows.reduce(
        (a, r) => a + n0(r.original.openingAccumulatedDepreciation),
        0
      ),
      depreciationForPeriod: rows.reduce(
        (a, r) => a + n0(r.original.depreciationForPeriod),
        0
      ),
      depreciationOnDisposals: rows.reduce(
        (a, r) => a + n0(r.original.depreciationOnDisposals),
        0
      ),
      closingAccumulatedDepreciation: rows.reduce(
        (a, r) => a + n0(r.original.closingAccumulatedDepreciation),
        0
      ),

      openingNBV: rows.reduce((a, r) => a + n0(r.original.openingNBV), 0),
      closingNBV: rows.reduce((a, r) => a + n0(r.original.closingNBV), 0)
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
  }, [table, assets])

  // ✅ PLACE IT HERE (right after `table`)
  const exportContextLine = React.useMemo(() => {
    const bits: string[] = []

    if (clientName) bits.push(clientName)
    if (periodLabel) bits.push(periodLabel)

    const isFiltered =
      !!table.getState().globalFilter ||
      (table.getState().columnFilters?.length ?? 0) > 0

    if (isFiltered) bits.push('Filtered view')
    bits.push(`Generated: ${new Date().toLocaleDateString('en-GB')}`)

    return bits.join(' • ')
  }, [clientName, periodLabel, table])

  const exportToPDF = async () => {
    const exportRows = table.getFilteredRowModel().rows.map(r => r.original)

    // Totals that match register columns
    const totals = exportRows.reduce(
      (acc, a) => ({
        openingCost: acc.openingCost + Number(a.openingCost),
        costAdj: acc.costAdj + Number(a.costAdjustmentForPeriod),
        additions: acc.additions + Number(a.additionsAtCost),
        disposalsCost: acc.disposalsCost + Number(a.disposalsAtCost),
        closingCost: acc.closingCost + Number(a.closingCost),

        openingDep: acc.openingDep + Number(a.openingAccumulatedDepreciation),
        depCharge: acc.depCharge + Number(a.depreciationForPeriod),
        depOnDisp: acc.depOnDisp + Number(a.depreciationOnDisposals),
        closingDep: acc.closingDep + Number(a.closingAccumulatedDepreciation),

        openingNBV: acc.openingNBV + Number(a.openingNBV),
        closingNBV: acc.closingNBV + Number(a.closingNBV)
      }),
      {
        openingCost: 0,
        costAdj: 0,
        additions: 0,
        disposalsCost: 0,
        closingCost: 0,

        openingDep: 0,
        depCharge: 0,
        depOnDisp: 0,
        closingDep: 0,

        openingNBV: 0,
        closingNBV: 0
      }
    )

    await exportTableToPDF<AssetWithPeriodCalculations>({
      title: 'Fixed Assets Register',
      subtitle: exportContextLine, // ✅
      fileName: 'fixed-assets-register.pdf',
      orientation: 'landscape',

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
          header: 'Cost b/fwd',
          accessor: a => formatWholeGBP(a.openingCost),
          align: 'right',
          width: 18
        },
        {
          header: 'Adj',
          accessor: a => formatWholeGBP(a.costAdjustmentForPeriod),
          align: 'right',
          width: 14
        },
        {
          header: 'Additions',
          accessor: a => formatWholeGBP(a.additionsAtCost),
          align: 'right',
          width: 18
        },
        {
          header: 'Disposals',
          accessor: a => formatDisposal(a.disposalsAtCost), // brackets like UI
          align: 'right',
          width: 18
        },
        {
          header: 'Cost c/fwd',
          accessor: a => formatWholeGBP(a.closingCost),
          align: 'right',
          width: 18
        },

        {
          header: "Dep'n b/fwd",
          accessor: a => formatWholeGBP(a.openingAccumulatedDepreciation),
          align: 'right',
          width: 18
        },
        {
          header: 'Charge',
          accessor: a => formatWholeGBP(a.depreciationForPeriod),
          align: 'right',
          width: 16
        },
        {
          header: 'Disp',
          accessor: a => formatDisposal(a.depreciationOnDisposals), // brackets like UI
          align: 'right',
          width: 16
        },
        {
          header: "Dep'n c/fwd",
          accessor: a => formatWholeGBP(a.closingAccumulatedDepreciation),
          align: 'right',
          width: 18
        },

        {
          header: 'Opening NBV',
          accessor: a => formatWholeGBP(a.openingNBV),
          align: 'right',
          width: 18
        },
        {
          header: 'Closing NBV',
          accessor: a => formatWholeGBP(a.closingNBV),
          align: 'right',
          width: 18
        }
      ],

      rows: exportRows,

      // If your PDF helper supports totals as a final row, keep it consistent.
      totals: {
        'Cost b/fwd': formatWholeGBP(totals.openingCost),
        Adj: formatWholeGBP(totals.costAdj),
        Additions: formatWholeGBP(totals.additions),
        Disposals: formatDisposal(totals.disposalsCost), // ✅ brackets
        'Cost c/fwd': formatWholeGBP(totals.closingCost),

        "Dep'n b/fwd": formatWholeGBP(totals.openingDep),
        Charge: formatWholeGBP(totals.depCharge),
        Disp: formatDisposal(totals.depOnDisp), // ✅ brackets
        "Dep'n c/fwd": formatWholeGBP(totals.closingDep),

        'Opening NBV': formatWholeGBP(totals.openingNBV),
        'Closing NBV': formatWholeGBP(totals.closingNBV)
      }
    })
  }

  const exportToExcel = async () => {
    const XLSX = await import('xlsx-js-style')

    const exportRows = table.getFilteredRowModel().rows.map(r => r.original)

    const worksheet_data = [
      [reportSubtitle ?? 'Fixed Assets Register'],
      [exportContextLine], // ✅
      [],
      [
        'Asset',
        'Category',
        'Purchased',

        'Cost b/fwd',
        'Adjustment',
        'Additions',
        'Disposals',
        'Cost c/fwd',

        "Dep'n b/fwd",
        'Charge',
        "Dep'n on disposals",
        "Dep'n c/fwd",

        'Opening NBV',
        'Closing NBV'
      ],
      ...exportRows.map(a => [
        a.name,
        a.category?.name ?? '—',
        formatDate(a.acquisitionDate),

        Number(a.openingCost),
        Number(a.costAdjustmentForPeriod),
        Number(a.additionsAtCost),
        -Number(a.disposalsAtCost), // ✅ store as negative in Excel so it naturally brackets if you format accounting later
        Number(a.closingCost),

        Number(a.openingAccumulatedDepreciation),
        Number(a.depreciationForPeriod),
        -Number(a.depreciationOnDisposals), // ✅ negative
        Number(a.closingAccumulatedDepreciation),

        Number(a.openingNBV),
        Number(a.closingNBV)
      ])
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data)

    worksheet['!cols'] = [
      { wch: 28 }, // Asset
      { wch: 18 }, // Category
      { wch: 14 }, // Purchased

      { wch: 14 }, // Cost bfwd
      { wch: 12 }, // Adj
      { wch: 12 }, // Additions
      { wch: 12 }, // Disposals
      { wch: 14 }, // Cost cfwd

      { wch: 14 }, // Dep bfwd
      { wch: 12 }, // Charge
      { wch: 16 }, // Dep on disp
      { wch: 14 }, // Dep cfwd

      { wch: 14 }, // Opening NBV
      { wch: 14 } // Closing NBV
    ]

    // Merge the title row across all columns
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } } // ✅ context line
    ]

    // ---- Header styling ----
    const headerStyle = {
      font: {
        bold: true,
        color: { rgb: 'FFFFFF' }
      },
      fill: {
        patternType: 'solid',
        fgColor: { rgb: '1F7A1F' }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center'
      }
    }

    const headerRowIndex = 3
    const range = XLSX.utils.decode_range(worksheet['!ref']!)

    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: C })
      if (worksheet[addr]) worksheet[addr].s = headerStyle
    }

    // ---- Freeze panes ----
    worksheet['!freeze'] = { xSplit: 0, ySplit: 4 }

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
            <SelectTrigger className='w-32.5'>
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
                  <div className='flex flex-col items-center gap-2 py-6'>
                    <Package className='text-muted-foreground/50 h-8 w-8' />
                    <p>No assets found</p>
                    <p className='text-sm'>
                      Create your first fixed asset to get started.
                    </p>
                  </div>
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
