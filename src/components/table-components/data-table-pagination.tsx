'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Table } from '@tanstack/react-table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps<TData> {
  table: Table<TData>
  pagination: { pageIndex: number; pageSize: number }
  setPagination: (pagination: { pageIndex: number; pageSize: number }) => void
}

export function PaginationMobileFriendly<TData>({
  table,
  pagination,
  setPagination
}: PaginationProps<TData>) {
  const { pageIndex, pageSize } = pagination
  const pageCount = table.getPageCount()

  // Clamp pageIndex if necessary
  if (pageIndex > pageCount - 1 && pageCount > 0) {
    setPagination({ ...pagination, pageIndex: pageCount - 1 })
    table.setPageIndex(pageCount - 1)
  }

  const goToPage = (index: number) => {
    setPagination({ ...pagination, pageIndex: index })
    table.setPageIndex(index)
  }

  const changePageSize = (size: number) => {
    setPagination({ pageIndex: 0, pageSize: size })
    table.setPageSize(size)
    table.setPageIndex(0)
  }

  // Full pages for large screens
  const pages = generatePages(pageIndex, pageCount)

  return (
    <div className='flex flex-col items-center justify-between gap-2 px-4 py-3 2xl:flex-row 2xl:gap-4'>
      {/* Rows per page selector */}
      <div className='flex items-center gap-2'>
        <span className='text-sm'>Rows per page:</span>
        <Select
          value={String(pageSize)}
          onValueChange={v => changePageSize(Number(v))}
        >
          <SelectTrigger className='h-8 w-[70px]'>
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 30, 40, 50].map(size => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Page info */}
      <div className='text-sm'>
        Page {pageIndex + 1} of {pageCount || 1}
      </div>

      {/* Pagination buttons */}
      <div className='flex flex-wrap items-center gap-1'>
        {/* First page */}
        <Button
          variant='outline'
          size='icon'
          disabled={pageIndex === 0}
          onClick={() => goToPage(0)}
        >
          <ChevronsLeft />
        </Button>

        {/* Previous */}
        <Button
          variant='outline'
          size='icon'
          disabled={pageIndex === 0}
          onClick={() => goToPage(pageIndex - 1)}
        >
          <ChevronLeft />
        </Button>

        {/* Numeric buttons: show full on lg screens, compact on mobile */}
        <div className='hidden gap-1 2xl:flex'>
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={i} className='px-2 text-sm'>
                …
              </span>
            ) : (
              <Button
                key={p}
                variant='outline'
                className={cn(
                  'h-8 w-8 px-0',
                  p === pageIndex + 1 && 'bg-primary text-primary-foreground'
                )}
                onClick={() => goToPage(p - 1)}
              >
                {p}
              </Button>
            )
          )}
        </div>

        {/* Mobile: show only current page number */}
        <div className='flex px-2 text-sm font-medium 2xl:hidden'>
          {pageIndex + 1}
        </div>

        {/* Next */}
        <Button
          variant='outline'
          size='icon'
          disabled={pageIndex === pageCount - 1 || pageCount === 0}
          onClick={() => goToPage(pageIndex + 1)}
        >
          <ChevronRight />
        </Button>

        {/* Last page */}
        <Button
          variant='outline'
          size='icon'
          disabled={pageIndex === pageCount - 1 || pageCount === 0}
          onClick={() => goToPage(pageCount - 1)}
        >
          <ChevronsRight />
        </Button>
      </div>
    </div>
  )
}

/* Generate numeric page buttons with ellipsis */
function generatePages(pageIndex: number, total: number): (number | '…')[] {
  const current = pageIndex + 1
  const pages: (number | '…')[] = []

  if (total <= 7) {
    return [...Array(total)].map((_, i) => i + 1)
  }

  pages.push(1)
  if (current > 4) pages.push('…')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 3) pages.push('…')
  pages.push(total)

  return pages
}
