'use client'

import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { OrganizationType } from '@/zod-schemas/organizations'
import AddClientDialog from './add-client-dialog'

interface ClientButtonProps {
  organization: OrganizationType
}

export const AddClientButton = ({ organization }: ClientButtonProps) => {
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
      />
    </>
  )
}
