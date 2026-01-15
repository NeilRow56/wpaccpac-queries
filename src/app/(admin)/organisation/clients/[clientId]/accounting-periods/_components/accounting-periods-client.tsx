// app/accounting-periods/_components/accounting-periods-client.tsx

'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { AccountingPeriodForm } from './accounting-period-form'
import { ClosePeriodModal } from './close-period-modal'
import {
  createAccountingPeriod,
  deleteAccountingPeriod,
  updateAccountingPeriod
} from '@/server-actions/accounting-periods'

import type { PeriodStatus } from '@/db/schema'
import type { AccountingPeriod } from '@/domain/accounting-periods/types'

interface AccountingPeriodsClientProps {
  periods: AccountingPeriod[]
  clientId: string
  clientName: string
  plannedPeriodId: string | null
}

const getStatus = (p: AccountingPeriod): PeriodStatus => p.status

// Editable means you can edit/delete/close via UI rules (adjust if your rule differs)
const isEditable = (p: AccountingPeriod) =>
  p.status === 'OPEN' || p.status === 'PLANNED'

export function AccountingPeriodsClient({
  periods,
  clientId,
  clientName,
  plannedPeriodId
}: AccountingPeriodsClientProps) {
  const router = useRouter()

  const [selectedPeriod, setSelectedPeriod] =
    React.useState<AccountingPeriod | null>(null)

  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)

  const [showCloseModal, setShowCloseModal] = React.useState(false)
  const [periodToClose, setPeriodToClose] =
    React.useState<AccountingPeriod | null>(null)

  // Derived state
  const filteredPeriods = periods
  const currentOpenPeriod = filteredPeriods.find(
    p => p.isCurrent && p.status === 'OPEN'
  )

  const hasAnyPeriods = filteredPeriods.length > 0
  const hasOpen = filteredPeriods.some(p => p.status === 'OPEN')

  // For form context only (optional)
  const periodStatus: PeriodStatus | undefined = currentOpenPeriod?.status

  // ---------------------------
  // Pagination (simple client-side)
  // ---------------------------
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const totalItems = filteredPeriods.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  React.useEffect(() => {
    setPage(1)
  }, [clientId, totalItems])

  React.useEffect(() => {
    setPage(prev => Math.min(prev, totalPages))
  }, [totalPages])

  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const paginatedPeriods = React.useMemo(() => {
    return filteredPeriods.slice(startIndex, startIndex + pageSize)
  }, [filteredPeriods, startIndex, pageSize])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreate = async (values: any) => {
    try {
      const result = await createAccountingPeriod(values)
      if (result.success) {
        toast.success('Accounting period created successfully')
        setShowCreateModal(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create period')
      }
    } catch (error) {
      console.log(error)
      toast.error('An unexpected error occurred')
    }
  }

  const handleEdit = (period: AccountingPeriod) => {
    setSelectedPeriod(period)
    setShowEditModal(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdate = async (values: any) => {
    try {
      const result = await updateAccountingPeriod(values)
      if (result.success) {
        toast.success('Accounting period updated successfully')
        setShowEditModal(false)
        setSelectedPeriod(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update period')
      }
    } catch (error) {
      console.log(error)
      toast.error('An unexpected error occurred')
    }
  }

  const handleDelete = async (period: AccountingPeriod) => {
    if (!isEditable(period)) {
      toast.error('Cannot delete a closed period')
      return
    }

    if (!confirm(`Are you sure you want to delete "${period.periodName}"?`)) {
      return
    }

    try {
      const result = await deleteAccountingPeriod(period.id)
      if (result.success) {
        toast.success('Accounting period deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete period')
      }
    } catch (error) {
      console.log(error)
      toast.error('An unexpected error occurred')
    }
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-GB').format(new Date(date))
  }

  const getDaysInPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <>
      <div className='space-y-4'>
        {/* Header: guided setup banner + stats + actions */}
        <div className='flex items-start justify-between gap-4'>
          {!currentOpenPeriod && (
            <div className='w-full max-w-xl rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm'>
              {!hasAnyPeriods ? (
                <>
                  <strong>Create your first accounting period.</strong>
                  <div className='text-muted-foreground mt-1'>
                    Periods are required for depreciation schedules and posting.
                  </div>
                  <div className='mt-3'>
                    <Button size='sm' onClick={() => setShowCreateModal(true)}>
                      <Plus className='mr-2 h-4 w-4' />
                      Create period
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <strong>No open period is currently active.</strong>
                  <div className='text-muted-foreground mt-1'>
                    Open a planned period to enable posting and depreciation.
                  </div>

                  <div className='mt-3 flex gap-2'>
                    {plannedPeriodId ? (
                      <Link
                        href={`/organisation/clients/${clientId}/accounting-periods/${plannedPeriodId}/planning`}
                      >
                        <Button size='sm'>Open planned period</Button>
                      </Link>
                    ) : (
                      <Button
                        size='sm'
                        onClick={() => setShowCreateModal(true)}
                      >
                        <Plus className='mr-2 h-4 w-4' />
                        Create next period
                      </Button>
                    )}

                    {/* <Link
                      href={`/organisation/clients/${clientId}/fixed-assets`}
                    >
                      <Button variant='outline' size='sm'>
                        Go to fixed assets
                      </Button>
                    </Link> */}
                  </div>
                </>
              )}
            </div>
          )}

          <div className='flex items-center gap-4'>
            <p className='text-muted-foreground text-sm'>
              {filteredPeriods.length}{' '}
              {filteredPeriods.length === 1 ? 'period' : 'periods'}
            </p>
          </div>

          {/* Your current UX: prevent creating a new period while one is OPEN/current */}
          <Button onClick={() => setShowCreateModal(true)} disabled={!!hasOpen}>
            <Plus className='mr-2 h-4 w-4' />
            Create Period
          </Button>
        </div>

        {/* Periods Table */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className='w-[70px]'></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredPeriods.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className='text-muted-foreground py-8 text-center'
                  >
                    <div className='flex flex-col items-center gap-2'>
                      <Calendar className='text-muted-foreground/50 h-8 w-8' />
                      <p>No accounting periods found</p>
                      <p className='text-sm'>
                        Create your first period to get started
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPeriods.map(period => {
                  const status = getStatus(period)

                  return (
                    <TableRow key={period.id}>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>
                            {period.periodName}
                          </span>
                          {period.isCurrent && (
                            <Badge
                              variant='outline'
                              className='border-primary border text-xs'
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>{clientName}</TableCell>

                      <TableCell className='text-sm'>
                        {formatDate(period.startDate)}
                      </TableCell>
                      <TableCell className='text-sm'>
                        {formatDate(period.endDate)}
                      </TableCell>

                      <TableCell className='text-muted-foreground text-sm'>
                        {getDaysInPeriod(period.startDate, period.endDate)} days
                      </TableCell>

                      <TableCell>
                        {status === 'OPEN' ? (
                          <Badge variant='default' className='bg-green-600'>
                            Open
                          </Badge>
                        ) : status === 'PLANNED' ? (
                          <Badge variant='secondary'>Planned</Badge>
                        ) : status === 'CLOSING' ? (
                          <Badge variant='outline'>Closing</Badge>
                        ) : status === 'CLOSED' ? (
                          <Badge variant='destructive'>Closed</Badge>
                        ) : (
                          <Badge variant='outline'>Unknown</Badge>
                        )}
                      </TableCell>

                      <TableCell className='text-muted-foreground text-sm'>
                        {period.createdAt
                          ? formatDate(period.createdAt.toString())
                          : '—'}
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' className='h-8 w-8 p-0'>
                              <span className='sr-only'>Open menu</span>
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align='end'>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => handleEdit(period)}
                              disabled={!isEditable(period)}
                            >
                              <Pencil className='mr-2 h-4 w-4' />
                              Edit
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDelete(period)}
                              className='text-red-600'
                              disabled={!isEditable(period)}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Delete
                            </DropdownMenuItem>

                            {period.isCurrent && period.status === 'OPEN' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className='text-red-600'
                                  onClick={() => {
                                    setPeriodToClose(period)
                                    setShowCloseModal(true)
                                  }}
                                >
                                  Close period
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        {filteredPeriods.length > 0 && (
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-muted-foreground text-sm'>
              Showing{' '}
              <span className='text-foreground font-medium'>
                {startIndex + 1}
              </span>{' '}
              to <span className='text-foreground font-medium'>{endIndex}</span>{' '}
              of{' '}
              <span className='text-foreground font-medium'>{totalItems}</span>
            </p>

            <div className='flex items-center gap-2'>
              <label className='text-muted-foreground text-sm'>Rows:</label>
              <select
                className='border-input bg-background h-9 rounded-md border px-2 text-sm'
                value={pageSize}
                onChange={e => {
                  const next = Number(e.target.value)
                  setPageSize(next)
                  setPage(1)
                }}
              >
                {[5, 10, 20, 50].map(size => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <Button
                variant='outline'
                className='h-9'
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>

              <span className='text-muted-foreground text-sm'>
                Page <span className='text-foreground font-medium'>{page}</span>{' '}
                of{' '}
                <span className='text-foreground font-medium'>
                  {totalPages}
                </span>
              </span>

              <Button
                variant='outline'
                className='h-9'
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AccountingPeriodForm
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        clientId={clientId}
        periodStatus={periodStatus}
        mode='create'
      />

      {/* Edit Modal */}
      <AccountingPeriodForm
        accountingPeriod={selectedPeriod}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedPeriod(null)
        }}
        onSubmit={handleUpdate}
        clientId={clientId}
        periodStatus={periodStatus}
        mode='edit'
      />

      {showCloseModal && periodToClose && (
        <ClosePeriodModal
          period={periodToClose}
          clientId={clientId}
          onClose={() => {
            setShowCloseModal(false)
            setPeriodToClose(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
