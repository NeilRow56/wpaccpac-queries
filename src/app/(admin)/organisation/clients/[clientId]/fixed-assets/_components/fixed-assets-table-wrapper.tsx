'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FixedAssetsTable } from './fixed-assets-table'

import {
  createAsset,
  createHistoricAsset,
  deleteAsset,
  updateAsset
} from '@/server-actions/assets'

import { AssetFormValues } from '@/zod-schemas/fixedAssets'

import { AssetForm } from './asset-form'
import { AccountingPeriod } from '@/db/schema'

import {
  AssetWithCalculations,
  AssetWithPeriodCalculations,
  AssetWithPeriodUI
} from '@/lib/asset-calculations'
import { DepreciationScheduleModal } from './depreciation-schedule-modal'
import { HistoricAssetForm } from './historic-asset-form'

interface FixedAssetsTableWrapperProps {
  assets: AssetWithPeriodCalculations[]
  period: AccountingPeriod
  clientId: string
  clientName: string

  categories: Array<{
    id: string
    name: string
    clientId: string
  }>
}

export function FixedAssetsTableWrapper({
  assets,
  period,
  clientId,
  categories
}: FixedAssetsTableWrapperProps) {
  const router = useRouter()

  const [selectedAsset, setSelectedAsset] =
    React.useState<AssetWithPeriodCalculations | null>(null)

  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showScheduleModal, setShowScheduleModal] = React.useState(false)
  const [showHistoricModal, setShowHistoricModal] = React.useState(false)
  /* -----------------------------
     CREATE
  ----------------------------- */
  const handleCreate = async (values: AssetFormValues) => {
    try {
      const result = await createAsset({
        ...values,
        clientId,

        // ✅ normalize optional → required
        categoryId: values.categoryId ?? '',
        costAdjustment: values.costAdjustment ?? '0'
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

  const handleViewSchedule = (asset: AssetWithPeriodCalculations) => {
    setSelectedAsset(asset)
    setShowScheduleModal(true)
  }

  /* -----------------------------
     EDIT
  ----------------------------- */
  const handleEdit = (asset: AssetWithPeriodCalculations) => {
    setSelectedAsset(asset)
    setShowEditModal(true)
  }

  const handleUpdate = async (values: AssetFormValues & { id: string }) => {
    try {
      const result = await updateAsset({
        ...values,
        clientId,

        categoryId: values.categoryId ?? '',
        costAdjustment: values.costAdjustment ?? '0'
      })

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
  const handleDelete = async (asset: AssetWithPeriodCalculations) => {
    const confirmed = window.confirm(
      'Are you sure? Assets with posted depreciation cannot be deleted.'
    )
    if (!confirmed) return

    try {
      const result = await deleteAsset(asset.id)

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

        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => setShowHistoricModal(true)}>
            Add Historic Asset
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Create New Asset
          </Button>
        </div>
      </div>

      <FixedAssetsTable
        assets={assets}
        onRowClick={asset => {
          router.push(
            `/organisation/clients/${clientId}/fixed-assets/${asset.id}`
          )
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewSchedule={handleViewSchedule} // ✅ ADD THIS
      />

      {showScheduleModal && selectedAsset && (
        <DepreciationScheduleModal
          asset={toPeriodUIAsset(selectedAsset)}
          period={{
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            name: period.periodName
          }}
          open
          onClose={() => {
            setShowScheduleModal(false)
            setSelectedAsset(null)
          }}
        />
      )}

      <HistoricAssetForm
        open={showHistoricModal}
        onClose={() => setShowHistoricModal(false)}
        clientId={clientId}
        periodId={period.id}
        periodStartDate={new Date(period.startDate)}
        categories={categories}
        onSubmit={async values => {
          const result = await createHistoricAsset(values) // your server action
          if (!result.success) {
            toast.error('Failed to create historic asset')
            return
          }
          toast.success('Historic asset created')
          setShowHistoricModal(false)
          router.refresh()
        }}
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
          asset={toEditableAsset(selectedAsset)}
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

export function toPeriodUIAsset(
  asset: AssetWithPeriodCalculations
): AssetWithPeriodUI {
  return {
    id: asset.id,
    name: asset.name,
    clientId: asset.clientId,

    acquisitionDate: new Date(asset.acquisitionDate),
    originalCost: Number(asset.originalCost),
    depreciationRate: Number(asset.depreciationRate),

    openingNBV: Number(asset.openingNBV),
    depreciationForPeriod: Number(asset.depreciationForPeriod),
    closingNBV: Number(asset.closingNBV)
  }
}

function toEditableAsset(
  asset: AssetWithPeriodCalculations
): AssetWithCalculations {
  const originalCost = Number(asset.originalCost)
  const costAdjustment = Number(asset.costAdjustment ?? 0)

  const adjustedCost = originalCost + costAdjustment

  return {
    id: asset.id,
    name: asset.name,
    clientId: asset.clientId,

    categoryId: asset.category?.id ?? null,
    categoryName: asset.category?.name ?? null,
    description: asset.description ?? '',
    acquisitionDate: new Date(asset.acquisitionDate),

    originalCost,
    costAdjustment,

    adjustedCost,

    depreciationRate: Number(asset.depreciationRate),
    depreciationMethod: asset.depreciationMethod,

    daysSinceAcquisition: 0, // not needed for schedule
    depreciationForPeriod: asset.depreciationForPeriod,
    netBookValue: asset.closingNBV
  }
}
