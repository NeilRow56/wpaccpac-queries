'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Pencil, Trash2, Calendar } from 'lucide-react'
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
import {
  createAccountingPeriod,
  deleteAccountingPeriod,
  updateAccountingPeriod
} from '@/server-actions/accounting-periods'

interface AccountingPeriod {
  id: string
  clientId: string
  periodName: string
  startDate: string
  endDate: string
  isOpen: boolean
  isCurrent: boolean
  createdAt: Date | null
}

interface AccountingPeriodsClientProps {
  periods: AccountingPeriod[]
  clientId: string
  clientName: string // Add this
}

export function AccountingPeriodsClient({
  periods,
  clientId,
  clientName // Add this
}: AccountingPeriodsClientProps) {
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] =
    React.useState<AccountingPeriod | null>(null)
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  // const [selectedClient] = React.useState<string>('all')

  // Filter periods by selected client
  // const filteredPeriods =
  //   selectedClient === 'all'
  //     ? periods
  //     : periods.filter(p => p.clientId === selectedClient)

  const filteredPeriods = periods

  // Get client name helper
  //   const getClientName = (clientId: string) => {
  //     return client?.name || clientId
  //   }

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleDelete = async (period: AccountingPeriod) => {
    if (!period.isOpen) {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
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
        {/* Header with filters and actions */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <p className='text-muted-foreground text-sm'>
              {filteredPeriods.length}{' '}
              {filteredPeriods.length === 1 ? 'period' : 'periods'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
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
                filteredPeriods.map(period => (
                  <TableRow key={period.id}>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{period.periodName}</span>
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
                    {/* Use clientName instead of period.clientId */}
                    {/* ... rest of cells */}
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
                      {period.isOpen ? (
                        <Badge variant='default' className='bg-green-600'>
                          Open
                        </Badge>
                      ) : (
                        <Badge variant='destructive'>Closed</Badge>
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
                            // disabled={!period.isOpen}
                          >
                            <Pencil className='mr-2 h-4 w-4' />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(period)}
                            className='text-red-600'
                            disabled={!period.isOpen}
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Create Modal */}
      <AccountingPeriodForm
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        clientId={clientId}
        mode='create'
      />
      {/* Edit Modal */}
      <AccountingPeriodForm
        accountingPeriods={selectedPeriod}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedPeriod(null)
        }}
        onSubmit={handleUpdate}
        clientId={clientId}
        mode='edit'
      />
    </>
  )
}
