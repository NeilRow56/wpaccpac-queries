'use client'

import React, { startTransition, useState } from 'react'

import ConfirmationDialog from '@/components/shared/confirmation-dialog'

import { toast } from 'sonner'
import { usePathname } from 'next/navigation'
import { Trash2 } from 'lucide-react'

import { Organization } from '@/db/schema/authSchema'

import { EmptyState } from '@/components/shared/empty-state'
import { CostCentre, columns } from './columns'
import AddCostCentreDialog from './add-cost-centre-dialog'
import { AddCostCentreButton } from './add-cost-centre-button'
import { deleteCostCentre } from '@/server-actions/cost-centres'
import { DataTable } from '@/components/table-components/data-table'

type Props = {
  data: {
    id: string
    name: string
  }[]
  total: number
  organization: Organization
}

export default function CostCentreTable({ data, total, organization }: Props) {
  const [openConfirmationDialog, setOpenConfirmationDialog] = useState(false)
  const [itemToAction, setItemToAction] = useState<CostCentre>()

  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // const handleRowDelete = (item: CostCentre) => {
  //   setOpenConfirmationDialog(true)
  //   setItemToAction(item)
  // }

  const handleRowEdit = (item: CostCentre) => {
    setItemToAction(item)
    setOpen(true)
  }

  const handleConfirm = async () => {
    setOpenConfirmationDialog(false)

    if (itemToAction) {
      startTransition(async () => {
        await deleteCostCentre(itemToAction.id, pathname)
      })

      toast.warning(`Cost center ${itemToAction.name} deleted`, {
        description: '',
        duration: 5000,
        icon: <Trash2 className='size-4 text-red-500' />
      })
    }
  }

  if (total === 0) {
    return (
      <>
        <div className='mx-auto flex max-w-6xl flex-col gap-2'>
          <EmptyState
            title='Cost centers'
            description='You do not have any cost centers yet. Click on the button below to create your first cost center'
          />
        </div>

        <div className='- mt-12 flex w-full justify-center'>
          {/* <Button asChild size='lg' className='i flex w-[200px]'>
            <Link href='/admin/categories/form'>Create Category</Link>
          </Button> */}
          <AddCostCentreButton organization={organization} />
        </div>
      </>
    )
  }

  return (
    <div className='container mx-auto my-12 max-w-6xl'>
      <div className='mb-12 flex w-full items-center justify-between'>
        <span className='text-3xl font-bold'>Cost centres </span>

        {/* <Button asChild size='sm' className='flex'>
          <Link href='/admin/categories/form'>Create category</Link>
        </Button> */}
        <AddCostCentreButton organization={organization} />
      </div>
      <DataTable
        data={data}
        columns={columns}
        // onRowDelete={handleRowDelete}
        onRowEdit={handleRowEdit}
      />

      <AddCostCentreDialog
        open={open}
        setOpen={setOpen}
        costCentre={itemToAction}
        organization={organization}
      />

      <ConfirmationDialog
        message='This action cannot be undone. This will permanently delete the cost center and remove your data from our servers.'
        open={openConfirmationDialog}
        onClose={() => setOpenConfirmationDialog(false)}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
