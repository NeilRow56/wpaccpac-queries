// components/depreciation-schedule-modal.tsx
'use client'

import * as React from 'react'
import {
  getAssetDepreciationScheduleAction,
  type DepScheduleRow
} from '@/server-actions/depreciation-schedule'

import type { PeriodStatus } from '@/db/schema'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { AssetWithPeriodUI } from '@/lib/asset-calculations'
import { exportTableToPDF } from '@/lib/pdf/export-table-to-pdf'

interface DepreciationScheduleModalProps {
  asset: AssetWithPeriodUI
  clientId: string
  period: {
    startDate: Date
    endDate: Date
    name?: string
    periodStatus: PeriodStatus
  }
  open: boolean
  onClose: () => void
}

interface ScheduleEntry {
  year: number
  startDate: string
  endDate: string
  openingBalance: number
  depreciation: number
  closingBalance: number

  // ✅ disposal export fields
  proceeds?: number
  nbvDisposed?: number
  profitOrLoss?: number
  status?: string
}

export function DepreciationScheduleModal({
  asset,
  period,
  clientId,
  open,
  onClose
}: DepreciationScheduleModalProps) {
  const { periodStatus } = period

  const formatGBP = (value: number) =>
    (Number(value) || 0).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

  const formatPL = (value: number) => {
    const n = Number(value) || 0
    const abs = Math.abs(n)
    const txt = formatGBP(abs)
    return n < 0 ? `(${txt})` : txt
  }

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-GB').format(date)

  const formatYMD = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Intl.DateTimeFormat('en-GB').format(
      new Date(Date.UTC(y, m - 1, d))
    )
  }

  const [rows, setRows] = React.useState<DepScheduleRow[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)

    getAssetDepreciationScheduleAction({ clientId, assetId: asset.id })
      .then(res => {
        if (cancelled) return
        if (res.success) setRows(res.rows)
        else setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, clientId, asset.id])

  // ✅ Schedule entries for export (now based on accumulated depreciation, not NBV)
  const schedule: ScheduleEntry[] = rows.map((r, idx) => {
    const hasDisposal =
      Number(r.disposalsCost) > 0 || Number(r.disposalProceeds) > 0

    const status =
      periodStatus === 'OPEN' && !r.isPosted ? 'Provisional' : 'Final'

    return {
      year: idx + 1,
      startDate: r.startDate,
      endDate: r.endDate,
      openingBalance: Number(r.depreciationBfwd ?? 0),
      depreciation: Number(r.depreciationCharge ?? 0),
      closingBalance: Number(r.closingAccumulatedDepreciation ?? 0),

      proceeds: hasDisposal ? Number(r.disposalProceeds ?? 0) : undefined,
      nbvDisposed: hasDisposal ? Number(r.nbvDisposed ?? 0) : undefined,
      profitOrLoss: hasDisposal
        ? Number(r.profitOrLossOnDisposal ?? 0)
        : undefined,
      status: hasDisposal ? status : undefined
    }
  })

  const exportScheduleToPDF = async () => {
    await exportTableToPDF<ScheduleEntry>({
      title: 'Depreciation Schedule',
      subtitle: `Asset: ${asset.name} • Cost: £${formatGBP(
        asset.originalCost
      )} • Rate: ${asset.depreciationRate}% • Purchase: ${formatDate(
        new Date(asset.acquisitionDate)
      )} • NBV: £${formatGBP(asset.closingNBV)}`,
      fileName: `depreciation-schedule-${asset.name
        .replace(/\s+/g, '-')
        .toLowerCase()}.pdf`,
      orientation: 'landscape',

      columns: [
        { header: 'Year', accessor: e => e.year, align: 'center', width: 12 },
        {
          header: 'Start Date',
          accessor: e => formatYMD(e.startDate),
          width: 22
        },
        { header: 'End Date', accessor: e => formatYMD(e.endDate), width: 22 },

        {
          header: 'Accum Dep b/fwd',
          accessor: e => formatGBP(e.openingBalance),
          align: 'right',
          width: 24
        },
        {
          header: 'Charge',
          accessor: e => formatGBP(e.depreciation),
          align: 'right',
          width: 18
        },
        {
          header: 'Accum Dep c/fwd',
          accessor: e => formatGBP(e.closingBalance),
          align: 'right',
          width: 24
        },

        // ✅ disposal columns
        {
          header: 'Proceeds',
          accessor: e => (e.proceeds != null ? formatGBP(e.proceeds) : ''),
          align: 'right',
          width: 18
        },
        {
          header: 'NBV disposed',
          accessor: e =>
            e.nbvDisposed != null ? formatGBP(e.nbvDisposed) : '',
          align: 'right',
          width: 20
        },
        {
          header: 'Profit/(Loss)',
          accessor: e =>
            e.profitOrLoss != null ? formatPL(e.profitOrLoss) : '',
          align: 'right',
          width: 20
        },
        {
          header: 'Status',
          accessor: e => e.status ?? '',
          width: 16
        }
      ],

      rows: schedule
    })
  }

  const exportScheduleToExcel = async () => {
    const XLSX = await import('xlsx')

    const worksheet_data = [
      ['Depreciation Schedule'],
      [`Asset: ${asset.name}`],
      [`Cost: ${formatGBP(asset.originalCost)}`],
      [`Depreciation Rate: ${asset.depreciationRate}%`],
      [`Purchase Date: ${formatDate(new Date(asset.acquisitionDate))}`],
      [`Current NBV: ${formatGBP(asset.closingNBV)}`],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      [
        'Year',
        'Start Date',
        'End Date',
        'Accum Dep b/fwd',
        'Charge',
        'Accum Dep c/fwd',
        'Proceeds',
        'NBV disposed',
        'Profit/(Loss)',
        'Status'
      ],
      ...schedule.map(entry => [
        entry.year,
        formatYMD(entry.startDate),
        formatYMD(entry.endDate),

        Number(entry.openingBalance),
        Number(entry.depreciation),
        Number(entry.closingBalance),

        entry.proceeds != null ? Number(entry.proceeds) : '',
        entry.nbvDisposed != null ? Number(entry.nbvDisposed) : '',
        entry.profitOrLoss != null ? Number(entry.profitOrLoss) : '',
        entry.status ?? ''
      ])
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data)

    worksheet['!cols'] = [
      { wch: 8 }, // Year
      { wch: 14 }, // Start Date
      { wch: 14 }, // End Date
      { wch: 18 }, // Acc dep bfwd
      { wch: 12 }, // Charge
      { wch: 18 }, // Acc dep cfwd
      { wch: 14 }, // Proceeds
      { wch: 14 }, // NBV disposed
      { wch: 14 }, // Profit/(Loss)
      { wch: 12 } // Status
    ]

    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Depreciation Schedule')

    XLSX.writeFile(
      workbook,
      `depreciation-schedule-${asset.name.replace(/\s+/g, '-').toLowerCase()}.xlsx`
    )
  }

  // ✅ Total depreciation up to disposal (handles elimination in final period)
  const totalDepreciation = rows.reduce(
    (max, r) => Math.max(max, Number(r.closingAccumulatedDepreciation ?? 0)),
    0
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-h-[90vh] min-w-3xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Depreciation Schedule - {asset.name}</DialogTitle>
          <DialogDescription>
            Detailed year-by-year depreciation schedule based on straight-line
            method
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Asset Summary */}
          <div className='bg-muted grid grid-cols-2 gap-4 rounded-lg p-4 md:grid-cols-4'>
            <div>
              <p className='text-muted-foreground text-sm'>Original Cost</p>
              <p className='text-lg font-semibold'>
                {formatGBP(asset.originalCost)}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Depreciation Rate</p>
              <p className='text-lg font-semibold'>{asset.depreciationRate}%</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Purchase Date</p>
              <p className='text-lg font-semibold'>
                {formatDate(new Date(asset.acquisitionDate))}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Current NBV</p>
              <p className='text-lg font-semibold'>
                {formatGBP(asset.closingNBV)}
              </p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className='flex justify-end gap-2'>
            <Button onClick={exportScheduleToExcel} variant='outline' size='sm'>
              <Download className='mr-2 h-4 w-4' />
              Export Excel
            </Button>
            <Button onClick={exportScheduleToPDF} variant='outline' size='sm'>
              <Download className='mr-2 h-4 w-4' />
              Export PDF
            </Button>
          </div>

          {/* Schedule Table */}
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-center'>Year</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className='text-right'>Accum Dep b/fwd</TableHead>
                  <TableHead className='text-right'>Charge</TableHead>
                  <TableHead className='text-right'>Accum Dep c/fwd</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((r, idx) => {
                  const hasDisposal =
                    Number(r.disposalsCost) > 0 ||
                    Number(r.disposalProceeds) > 0

                  return (
                    <React.Fragment key={r.periodId}>
                      <TableRow>
                        <TableCell className='text-center'>{idx + 1}</TableCell>
                        <TableCell>{r.periodName}</TableCell>
                        <TableCell>{formatYMD(r.endDate)}</TableCell>

                        <TableCell className='text-right'>
                          {formatGBP(r.depreciationBfwd)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatGBP(r.depreciationCharge)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {formatGBP(r.closingAccumulatedDepreciation)}
                        </TableCell>
                      </TableRow>

                      {hasDisposal && (
                        <TableRow className='bg-muted/30'>
                          <TableCell colSpan={6} className='p-3'>
                            <div className='space-y-1 text-sm'>
                              <div className='flex items-center justify-between'>
                                <span>Proceeds</span>
                                <span className='tabular-nums'>
                                  {formatGBP(r.disposalProceeds)}
                                </span>
                              </div>

                              <div className='flex items-center justify-between'>
                                <span>NBV disposed</span>
                                <span className='tabular-nums'>
                                  {formatGBP(r.nbvDisposed)}
                                </span>
                              </div>

                              <div className='flex items-center justify-between font-semibold'>
                                <span>Profit / (Loss) on disposal</span>
                                <span className='tabular-nums'>
                                  {formatPL(r.profitOrLossOnDisposal)}
                                </span>
                              </div>

                              {periodStatus === 'OPEN' && !r.isPosted && (
                                <div className='text-muted-foreground pt-1 text-xs'>
                                  Provisional (period not yet closed)
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>

              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className='font-bold'>
                    Total Depreciation
                  </TableCell>
                  <TableCell className='text-right font-bold'>
                    {loading ? '—' : formatGBP(totalDepreciation)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Summary Information */}
          <div className='text-muted-foreground space-y-1 text-sm'>
            <p>
              • Annual depreciation:{' '}
              {formatGBP((asset.originalCost * asset.depreciationRate) / 100)}
            </p>
            <p>• Useful life: {schedule.length} years</p>
            <p>• Method: Straight-line depreciation</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
