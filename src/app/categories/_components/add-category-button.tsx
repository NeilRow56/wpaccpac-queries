'use client'

import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

import AddCategoryDialog from './add-category-dialog'
import { User } from '@/db/schema/authSchema'

interface CategoryButtonProps {
  user: User // You must have a user to start a customer - so it is not optional
}

export const AddCategoryButton = ({ user }: CategoryButtonProps) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button className='cursor-pointer self-end' onClick={() => setOpen(true)}>
        <PlusIcon />
        Add category
      </Button>
      <AddCategoryDialog open={open} setOpen={setOpen} user={user} />
    </>
  )
}
