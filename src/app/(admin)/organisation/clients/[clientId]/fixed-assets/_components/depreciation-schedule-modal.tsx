// components/depreciation-schedule-modal.tsx
'use client'

import * as React from 'react'
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
  period: {
    startDate: Date
    endDate: Date
    name?: string
  }
  open: boolean
  onClose: () => void
}

interface ScheduleEntry {
  year: number
  startDate: Date
  endDate: Date
  openingBalance: number
  depreciation: number
  closingBalance: number
}

export function DepreciationScheduleModal({
  asset,
  period,
  open,
  onClose
}: DepreciationScheduleModalProps) {
  const formatGBP = (value: number) =>
    value.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-GB').format(date)

  const generateSchedule = () => [
    {
      year: 1,
      startDate: period.startDate,
      endDate: period.endDate,
      openingBalance: asset.openingNBV,
      depreciation: asset.depreciationForPeriod,
      closingBalance: asset.closingNBV
    }
  ]

  const schedule = generateSchedule()

  const exportScheduleToPDF = async () => {
    await exportTableToPDF<ScheduleEntry>({
      title: 'Depreciation Schedule',
      subtitle: `Asset: ${asset.name} • Rate: ${asset.depreciationRate}%`,
      fileName: `depreciation-schedule-${asset.name
        .replace(/\s+/g, '-')
        .toLowerCase()}.pdf`,

      orientation: 'landscape', // ✅ THIS is the key change

      columns: [
        {
          header: 'Year',
          accessor: e => e.year,
          align: 'center',
          width: 20
        },
        {
          header: 'Start Date',
          accessor: e => formatDate(e.startDate),
          width: 30
        },
        {
          header: 'End Date',
          accessor: e => formatDate(e.endDate),
          width: 30
        },
        {
          header: 'Opening Balance (£)',
          accessor: e => formatGBP(e.openingBalance),
          align: 'right',
          width: 35
        },
        {
          header: 'Depreciation (£)',
          accessor: e => formatGBP(e.depreciation),
          align: 'right',
          width: 35
        },
        {
          header: 'Closing Balance (£)',
          accessor: e => formatGBP(e.closingBalance),
          align: 'right',
          width: 35
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
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      [
        'Year',
        'Start Date',
        'End Date',
        'Opening Balance',
        'Depreciation',
        'Closing Balance'
      ],
      ...schedule.map(entry => [
        entry.year,
        formatDate(entry.startDate),
        formatDate(entry.endDate),
        entry.openingBalance,
        entry.depreciation,
        entry.closingBalance
      ])
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data)

    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 }
    ]

    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Depreciation Schedule')

    XLSX.writeFile(
      workbook,
      `depreciation-schedule-${asset.name.replace(/\s+/g, '-').toLowerCase()}.xlsx`
    )
  }

  const totalDepreciation = schedule.reduce(
    (sum, entry) => sum + entry.depreciation,
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
                {formatDate(asset.acquisitionDate)}
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
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className='text-right'>Opening Balance</TableHead>
                  <TableHead className='text-right'>Depreciation</TableHead>
                  <TableHead className='text-right'>Closing Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className='text-center font-medium'>
                      {entry.year}
                    </TableCell>
                    <TableCell>{formatDate(entry.startDate)}</TableCell>
                    <TableCell>{formatDate(entry.endDate)}</TableCell>
                    <TableCell className='text-right'>
                      {formatGBP(entry.openingBalance)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatGBP(entry.depreciation)}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatGBP(entry.closingBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className='font-bold'>
                    Total Depreciation
                  </TableCell>
                  <TableCell className='text-right font-bold'>
                    {formatGBP(totalDepreciation)}
                  </TableCell>
                  <TableCell></TableCell>
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
