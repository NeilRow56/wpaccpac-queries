// components/categories-client.tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, Pencil, Trash2, Package } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CategoryForm } from './category-form'
import {
  createCategory,
  deleteCategory,
  updateCategory
} from '@/server-actions/category-actions'

interface Category {
  id: string
  name: string
  clientId: string
  description?: string | null
  defaultDepreciationRate?: string | null
  createdAt: Date | null
  assetCount: number
}

interface CategoriesClientProps {
  categories: Category[]
  clients: Array<{ id: string; name: string }>
}

export function CategoriesClient({
  categories,
  clients
}: CategoriesClientProps) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] =
    React.useState<Category | null>(null)
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [selectedClient, setSelectedClient] = React.useState<string>('all')

  // Filter categories by selected client
  const filteredCategories =
    selectedClient === 'all'
      ? categories
      : categories.filter(cat => cat.clientId === selectedClient)

  // Get client name helper
  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || clientId
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCreate = async (values: any) => {
    try {
      const result = await createCategory(values)

      if (result.success) {
        toast.success('Category created successfully')
        setShowCreateModal(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create category')
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleEdit = (category: Category) => {
    setSelectedCategory(category)
    setShowEditModal(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdate = async (values: any) => {
    try {
      const result = await updateCategory(values)

      if (result.success) {
        toast.success('Category updated successfully')
        setShowEditModal(false)
        setSelectedCategory(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update category')
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleDelete = async (category: Category) => {
    if (category.assetCount > 0) {
      toast.error(
        `Cannot delete category with ${category.assetCount} assets assigned`
      )
      return
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return
    }

    try {
      const result = await deleteCategory(category.id)

      if (result.success) {
        toast.success('Category deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete category')
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '—'
    return new Intl.DateTimeFormat('en-GB').format(new Date(date))
  }

  return (
    <>
      <div className='space-y-4'>
        {/* Header with filters and actions */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className='w-[250px]'>
                <SelectValue placeholder='Filter by client' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-muted-foreground text-sm'>
              {filteredCategories.length}{' '}
              {filteredCategories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Create Category
          </Button>
        </div>

        {/* Categories Table */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Default Rate</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className='w-[70px]'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-muted-foreground py-8 text-center'
                  >
                    <div className='flex flex-col items-center gap-2'>
                      <Package className='text-muted-foreground/50 h-8 w-8' />
                      <p>No categories found</p>
                      <p className='text-sm'>
                        Create your first category to get started
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map(category => (
                  <TableRow key={category.id}>
                    <TableCell className='font-medium'>
                      {category.name}
                    </TableCell>
                    <TableCell>{getClientName(category.clientId)}</TableCell>
                    <TableCell className='max-w-xs truncate'>
                      {category.description || '—'}
                    </TableCell>
                    <TableCell>
                      {category.defaultDepreciationRate
                        ? `${category.defaultDepreciationRate}%`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          category.assetCount > 0 ? 'default' : 'secondary'
                        }
                      >
                        {category.assetCount}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {formatDate(category.createdAt)}
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
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className='mr-2 h-4 w-4' />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(category)}
                            className='text-red-600'
                            disabled={category.assetCount > 0}
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
      <CategoryForm
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        clients={clients}
        mode='create'
      />

      {/* Edit Modal */}
      <CategoryForm
        category={selectedCategory}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedCategory(null)
        }}
        onSubmit={handleUpdate}
        clients={clients}
        mode='edit'
      />
    </>
  )
}
