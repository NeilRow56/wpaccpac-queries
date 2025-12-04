'use client'

import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import AddOrganizationDialog from './add-organization-dialog'

export const AddOrganizationButton = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button className='cursor-pointer self-end' onClick={() => setOpen(true)}>
        <PlusIcon />
        Add organization
      </Button>
      <AddOrganizationDialog open={open} setOpen={setOpen} />
    </>
  )
}
