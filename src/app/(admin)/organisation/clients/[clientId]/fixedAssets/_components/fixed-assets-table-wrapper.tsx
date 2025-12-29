'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FixedAssetsTable } from './fixed-assets-table'

import { createAsset, deleteAsset, updateAsset } from '@/server-actions/assets'

import { AssetWithCalculations } from '@/lib/asset-calculations'
import { AssetFormValues } from '@/zod-schemas/fixedAssets'

import { AssetForm } from './asset-form'

interface FixedAssetsTableWrapperProps {
  assets: AssetWithCalculations[]
  // clients: Array<{ id: string; name: string }>
  clientId: string
  // clientName: string // Add this
  categories: Array<{ id: string; name: string; clientId: string }>
}

export function FixedAssetsTableWrapper({
  assets,
  // clients,
  clientId,
  // clientName,
  categories
}: FixedAssetsTableWrapperProps) {
  const router = useRouter()

  const [selectedAsset, setSelectedAsset] =
    React.useState<AssetWithCalculations | null>(null)

  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)

  /* -----------------------------
     CREATE
  ----------------------------- */
  const handleCreate = async (values: AssetFormValues) => {
    try {
      const result = await createAsset({
        ...values,
        clientId
      })

      if (!result.success) {
        toast.error('Failed to create asset')
        return
      }

      toast.success('Asset created successfully')
      setShowCreateModal(false)
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  /* -----------------------------
     EDIT
  ----------------------------- */
  const handleEdit = (asset: AssetWithCalculations) => {
    setSelectedAsset(asset)
    setShowEditModal(true)
  }

  const handleUpdate = async (values: AssetFormValues & { id: string }) => {
    try {
      const result = await updateAsset(values)

      if (!result.success) {
        toast.error('Failed to update asset')
        return
      }

      toast.success('Asset updated successfully')
      setShowEditModal(false)
      setSelectedAsset(null)
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  /* -----------------------------
     DELETE
  ----------------------------- */
  const handleDelete = async (assetId: string) => {
    try {
      const result = await deleteAsset(assetId)

      if (!result.success) {
        toast.error('Failed to delete asset')
        return
      }

      toast.success('Asset deleted successfully')
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  return (
    <>
      <div className='mb-4 flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>
          {assets.length} {assets.length === 1 ? 'asset' : 'assets'} registered
        </p>

        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Create New Asset
        </Button>
      </div>

      <FixedAssetsTable
        assets={assets}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AssetForm
        mode='create'
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        // clients={clients}
        clientId={clientId}
        categories={categories}
      />

      {selectedAsset && (
        <AssetForm
          mode='edit'
          asset={selectedAsset}
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedAsset(null)
          }}
          onSubmit={handleUpdate}
          // clients={clients}
          clientId={clientId}
          categories={categories}
        />
      )}
    </>
  )
}
