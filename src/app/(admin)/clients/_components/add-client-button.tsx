'use client'

import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { OrganizationType } from '@/zod-schemas/organizations'
import AddClientDialog from './add-client-dialog'
import { costCentre } from '@/db/schema'

interface ClientButtonProps {
  organization: OrganizationType
  orgCostCentres: costCentre[]
}

export const AddClientButton = ({
  organization,
  orgCostCentres
}: ClientButtonProps) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button className='cursor-pointer self-end' onClick={() => setOpen(true)}>
        <PlusIcon />
        Add client
      </Button>

      <AddClientDialog
        open={open}
        setOpen={setOpen}
        organization={organization}
        orgCostCentres={orgCostCentres}
      />
    </>
  )
}
