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
import { AssetWithCalculations } from '@/lib/asset-calculations'

interface DepreciationScheduleModalProps {
  asset: AssetWithCalculations
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
  open,
  onClose
}: DepreciationScheduleModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB').format(date)
  }

  const generateSchedule = (): ScheduleEntry[] => {
    const schedule: ScheduleEntry[] = []
    const purchaseDate = new Date(asset.dateOfPurchase)
    const adjustedCost = asset.cost + asset.adjustment
    const annualDepreciation = (adjustedCost * asset.depreciationRate) / 100

    let currentBalance = adjustedCost
    let year = 0

    // Generate schedule for the asset's useful life (until NBV reaches 0 or disposal value)
    while (currentBalance > 0 && year < 50) {
      // Max 50 years
      const startDate = new Date(purchaseDate)
      startDate.setFullYear(purchaseDate.getFullYear() + year)

      const endDate = new Date(purchaseDate)
      endDate.setFullYear(purchaseDate.getFullYear() + year + 1)
      endDate.setDate(endDate.getDate() - 1) // Last day of the period

      const openingBalance = currentBalance
      const depreciation = Math.min(annualDepreciation, currentBalance)
      const closingBalance = Math.max(0, currentBalance - depreciation)

      schedule.push({
        year: year + 1,
        startDate,
        endDate,
        openingBalance,
        depreciation,
        closingBalance
      })

      currentBalance = closingBalance
      year++

      if (closingBalance === 0) break
    }

    return schedule
  }

  const schedule = generateSchedule()

  const exportScheduleToPDF = async () => {
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')

    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Depreciation Schedule', 14, 22)

    doc.setFontSize(11)
    doc.text(`Asset: ${asset.name}`, 14, 30)
    doc.text(`Cost: ${formatCurrency(asset.cost)}`, 14, 36)
    doc.text(`Depreciation Rate: ${asset.depreciationRate}%`, 14, 42)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 48)

    const tableData = schedule.map(entry => [
      entry.year.toString(),
      formatDate(entry.startDate),
      formatDate(entry.endDate),
      formatCurrency(entry.openingBalance),
      formatCurrency(entry.depreciation),
      formatCurrency(entry.closingBalance)
    ])

    doc.autoTable({
      head: [
        [
          'Year',
          'Start Date',
          'End Date',
          'Opening Balance',
          'Depreciation',
          'Closing Balance'
        ]
      ],
      body: tableData,
      startY: 55,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' }
      }
    })

    doc.save(
      `depreciation-schedule-${asset.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
    )
  }

  const exportScheduleToExcel = async () => {
    const XLSX = await import('xlsx')

    const worksheet_data = [
      ['Depreciation Schedule'],
      [`Asset: ${asset.name}`],
      [`Cost: ${formatCurrency(asset.cost)}`],
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
      <DialogContent className='max-h-[90vh] max-w-5xl overflow-y-auto'>
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
                {formatCurrency(asset.cost)}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Depreciation Rate</p>
              <p className='text-lg font-semibold'>{asset.depreciationRate}%</p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Purchase Date</p>
              <p className='text-lg font-semibold'>
                {formatDate(asset.dateOfPurchase)}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground text-sm'>Current NBV</p>
              <p className='text-lg font-semibold'>
                {formatCurrency(asset.netBookValue)}
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
                      {formatCurrency(entry.openingBalance)}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrency(entry.depreciation)}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(entry.closingBalance)}
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
                    {formatCurrency(totalDepreciation)}
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
              {formatCurrency((asset.cost * asset.depreciationRate) / 100)}
            </p>
            <p>• Useful life: {schedule.length} years</p>
            <p>• Method: Straight-line depreciation</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
