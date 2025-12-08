'use client'

import { Button } from '@/components/ui/button'
import { Organization } from '@/db/schema'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import AddCostCentreDialog from './add-cost-centre-dialog'

interface CostCentreButtonProps {
  organization: Organization // You must have a user to start a customer - so it is not optional
}

export const AddCostCentreButton = ({
  organization
}: CostCentreButtonProps) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button className='cursor-pointer self-end' onClick={() => setOpen(true)}>
        <PlusIcon />
        Add cost center
      </Button>
      <AddCostCentreDialog
        open={open}
        setOpen={setOpen}
        organization={organization}
      />
    </>
  )
}
