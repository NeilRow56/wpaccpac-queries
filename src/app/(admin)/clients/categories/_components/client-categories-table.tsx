'use client'

import { startTransition, useState } from 'react'

import ConfirmationDialog from '@/components/shared/confirmation-dialog'

import { toast } from 'sonner'
import { usePathname } from 'next/navigation'
import { Trash2 } from 'lucide-react'

import { Organization } from '@/db/schema/authSchema'

import { EmptyState } from '@/components/shared/empty-state'
import { ClientCategory, columns } from './columns'

import AddCategoryDialog from './add-client-category-dialog'
import { deleteClientCategory } from '@/server-actions/cost-centres'
import { AddClientCategoryButton } from './add-client-category-button'
import { DataTable } from './data-table'

type Props = {
  data: {
    id: string
    name: string
  }[]
  total: number
  org: Organization
}

export default function ClientCategoriesTable({ data, total, org }: Props) {
  const [openConfirmationDialog, setOpenConfirmationDialog] = useState(false)
  const [itemToAction, setItemToAction] = useState<ClientCategory>()

  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const handleRowDelete = (item: ClientCategory) => {
    setOpenConfirmationDialog(true)
    setItemToAction(item)
  }

  const handleRowEdit = (item: ClientCategory) => {
    setItemToAction(item)
    setOpen(true)
  }

  const handleConfirm = async () => {
    setOpenConfirmationDialog(false)

    if (itemToAction) {
      startTransition(async () => {
        await deleteClientCategory(itemToAction.id, pathname)
      })

      toast.warning(`Category ${itemToAction.name} deleted`, {
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
            title='Categories'
            description='You have no categories yet. Click on the button below to create your first category'
          />
        </div>

        <div className='- mt-12 flex w-full justify-center'>
          <AddClientCategoryButton organization={org} />
        </div>
      </>
    )
  }

  return (
    <div className='container mx-auto my-12 max-w-6xl'>
      <div className='mb-12 flex w-full items-center justify-between'>
        <span className='text-3xl font-bold'>Client Cost Centers </span>

        <AddClientCategoryButton organization={org} />
      </div>
      <DataTable
        data={data}
        columns={columns}
        onRowDelete={handleRowDelete}
        onRowEdit={handleRowEdit}
      />

      <AddCategoryDialog
        open={open}
        setOpen={setOpen}
        clientCategory={itemToAction}
        organization={org}
      />

      <ConfirmationDialog
        message='This action cannot be undone. This will permanently delete the
            category and remove your data from our servers.'
        open={openConfirmationDialog}
        onClose={() => setOpenConfirmationDialog(false)}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
