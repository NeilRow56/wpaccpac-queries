// components/fixed-assets-table-wrapper.tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FixedAssetsTable } from './fixed-assets-table'
import { AssetFormValues, CreateAssetForm } from './create-asset-form'

import { AssetWithCalculations } from '@/lib/asset-calculations'

import { toast } from 'sonner'
import { createAsset, deleteAsset, updateAsset } from '@/server-actions/assets'
import { AssetFormEditValues, EditAssetForm } from './edit-form'

interface FixedAssetsTableWrapperProps {
  assets: AssetWithCalculations[]
  clients: Array<{ id: string; name: string }>
}

export function FixedAssetsTableWrapper({
  assets,
  clients
}: FixedAssetsTableWrapperProps) {
  const router = useRouter()

  const [selectedAsset, setSelectedAsset] =
    React.useState<AssetWithCalculations | null>(null)
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)

  const handleCreate = async (values: AssetFormValues) => {
    try {
      const result = await createAsset(values)

      if (result.success) {
        toast('Asset created successfully')
        setShowCreateModal(false)
        router.refresh()
      } else {
        toast('Failed to create asset')
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast('An unexpected error occurred')
    }
  }

  const handleEdit = (asset: AssetWithCalculations) => {
    setSelectedAsset(asset)
    setShowEditModal(true)
  }

  const handleDelete = async (assetId: number) => {
    try {
      const result = await deleteAsset(assetId)

      if (result.success) {
        toast('Asset deleted successfully')
        router.refresh()
      } else {
        toast('Failed to delete asset')
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast('An unexpected error occurred')
    }
  }

  const handleSubmitEdit = async (values: AssetFormEditValues) => {
    try {
      const result = await updateAsset(values)

      if (result.success) {
        toast('Asset edited successfully')
        setShowEditModal(false)
        setSelectedAsset(null)
        router.refresh()
      } else {
        toast('Failed to update asset')
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast('An unexpected error occurred')
    }
  }

  return (
    <>
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>
            {assets.length} {assets.length === 1 ? 'asset' : 'assets'}{' '}
            registered
          </p>
        </div>
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

      <CreateAssetForm
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        clients={clients}
      />

      <EditAssetForm
        asset={selectedAsset}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedAsset(null)
        }}
        onSubmit={handleSubmitEdit}
        clients={clients}
      />
    </>
  )
}
