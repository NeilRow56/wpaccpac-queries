'use client'

import React, { useState, useMemo, startTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Client, columns } from './columns'
import { DataTable } from '@/components/table-components/data-table'
import AddClientDialog from './add-client-dialog'
import { AddClientButton } from './add-client-button'
import ConfirmationDialog from '@/components/shared/confirmation-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { Organization } from '@/db/schema/authSchema'
import { costCentre } from '@/db/schema'
import { deleteClient } from '@/server-actions/clients'
import { ColumnFiltersState } from '@tanstack/react-table'

type Props = {
  data: Client[]
  total: number
  organization: Organization
  orgCostCentres: costCentre[]
}

// Define the type expected by AddClientDialog
type ClientDialogType = {
  id?: string
  name: string
  organizationId: string
  costCentreId: string
  entity_type: string
  notes?: string
  active?: boolean
}

// Mapping function from Client -> ClientDialogType
const mapClientForDialog = (client: Client): ClientDialogType => ({
  id: client.id,
  name: client.name,
  organizationId: client.organizationId,
  costCentreId: client.costCentreId ?? '', // convert null -> empty string
  entity_type: client.entity_type,
  notes: client.notes ?? '',
  active: client.active
})

export default function ClientsTable({
  data,
  total,
  organization,
  orgCostCentres
}: Props) {
  const [openDialog, setOpenDialog] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Client | undefined>()
  const [openConfirmationDialog, setOpenConfirmationDialog] = useState(false)
  const [itemToDelete] = useState<Client>()

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )

  const clientColumns = useMemo(() => columns(orgCostCentres), [orgCostCentres])

  const handleRowEdit = (item: Client) => {
    setClientToEdit(item)
    setOpenDialog(true)
  }

  const handleConfirmDelete = async () => {
    setOpenConfirmationDialog(false)

    if (itemToDelete) {
      startTransition(async () => {
        await deleteClient(itemToDelete.id)

        toast.warning(`Client ${itemToDelete.name} deleted`, {
          icon: <Trash2 className='size-4 text-red-500' />,
          duration: 5000
        })
      })
    }
  }

  if (total === 0) {
    return (
      <div className='mx-auto flex max-w-6xl flex-col gap-2'>
        <EmptyState
          title='Clients'
          description='You do not have any clients yet. Click the button below to create your first client.'
        />
        <AddClientButton
          organization={organization}
          orgCostCentres={orgCostCentres}
        />
      </div>
    )
  }

  return (
    <div className='container mx-auto my-8 max-w-6xl'>
      <div className='mb-8 flex w-full items-center justify-between'>
        <h1 className='text-primary text-3xl font-bold'>Clients</h1>
        <AddClientButton
          organization={organization}
          orgCostCentres={orgCostCentres}
          onClick={() => {
            setClientToEdit(undefined)
            setOpenDialog(true)
          }}
        />
      </div>

      <DataTable<Client, unknown>
        data={data}
        columns={clientColumns}
        onRowEdit={handleRowEdit}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
      />

      <AddClientDialog
        open={openDialog}
        setOpen={setOpenDialog}
        organization={organization}
        orgCostCentres={orgCostCentres}
        client={clientToEdit ? mapClientForDialog(clientToEdit) : undefined}
      />

      <ConfirmationDialog
        open={openConfirmationDialog}
        onClose={() => setOpenConfirmationDialog(false)}
        onConfirm={handleConfirmDelete}
        message='This action cannot be undone. This will permanently delete the client and remove your data from our servers.'
      />
    </div>
  )
}
