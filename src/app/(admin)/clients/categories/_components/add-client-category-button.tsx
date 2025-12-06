'use client'

import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import { OrganizationType } from '@/zod-schemas/organizations'
import AddCategoryDialog from './add-client-category-dialog'

interface CategoryButtonProps {
  organization: OrganizationType
}

export const AddClientCategoryButton = ({
  organization
}: CategoryButtonProps) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button className='cursor-pointer self-end' onClick={() => setOpen(true)}>
        <PlusIcon />
        Add category
      </Button>

      <AddCategoryDialog
        open={open}
        setOpen={setOpen}
        organization={organization}
      />
    </>
  )
}
