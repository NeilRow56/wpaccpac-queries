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
import { HistoricAssetForm } from './historic-asset-form'
import { DepreciationScheduleModal } from './depreciation-schedule-modal'

import { AccountingPeriod } from '@/db/schema'

import {
  AssetWithCalculations,
  AssetWithPeriodCalculations,
  AssetWithPeriodUI,
  calculateDaysSinceAcquisition
} from '@/lib/asset-calculations'
import { AssetMovementModal } from './asset-movement-modal'

interface FixedAssetsTableWrapperProps {
  assets: AssetWithPeriodCalculations[]
  period: AccountingPeriod
  clientId: string
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

  const [showMovementModal, setShowMovementModal] = React.useState(false)
  const [movementAsset, setMovementAsset] =
    React.useState<AssetWithPeriodCalculations | null>(null)

  const openMovementModal = (asset: AssetWithPeriodCalculations) => {
    // Optional guard (recommended)
    if (!period?.id) {
      toast.error('No current accounting period available.')
      return
    }
    if (!period.isOpen) {
      toast.error('Cannot post movements to a closed period.')
      return
    }

    setMovementAsset(asset)
    setShowMovementModal(true)
  }

  /* -----------------------------
     CREATE
  ----------------------------- */
  const handleCreate = async (values: AssetFormValues) => {
    try {
      const result = await createAsset({
        clientId,
        name: values.name,
        categoryId: values.categoryId ?? '',
        description: values.description,
        acquisitionDate: values.acquisitionDate,
        originalCost: values.originalCost,
        costAdjustment: values.costAdjustment ?? '0',
        depreciationMethod: values.depreciationMethod,
        depreciationRate: values.depreciationRate
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
     VIEW SCHEDULE
  ----------------------------- */
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
        id: values.id,
        clientId,
        name: values.name,
        categoryId: values.categoryId ?? '',
        description: values.description,
        acquisitionDate: values.acquisitionDate,
        originalCost: values.originalCost,
        costAdjustment: values.costAdjustment ?? '0',
        depreciationMethod: values.depreciationMethod,
        depreciationRate: values.depreciationRate
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
      const result = await deleteAsset({
        id: asset.id,
        clientId
      })

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
        onPostMovement={openMovementModal} // ✅ add this to table props
        onViewSchedule={handleViewSchedule}
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
          try {
            const result = await createHistoricAsset(values)
            if (!result.success) {
              toast.error('Failed to create historic asset')
              return
            }
            toast.success('Historic asset created')
            setShowHistoricModal(false)
            router.refresh()
          } catch {
            toast.error('An unexpected error occurred')
          }
        }}
      />

      <AssetForm
        mode='create'
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
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
          clientId={clientId}
          categories={categories}
        />
      )}

      {/* ✅ Movement modal */}
      {showMovementModal && movementAsset && (
        <AssetMovementModal
          open={showMovementModal}
          asset={movementAsset}
          clientId={clientId}
          period={{
            id: period.id,
            name: period.periodName,
            startDate: period.startDate, // YYYY-MM-DD
            endDate: period.endDate // YYYY-MM-DD
          }}
          onClose={() => {
            setShowMovementModal(false)
            setMovementAsset(null)
          }}
          onPosted={() => {
            toast.success('Asset movement posted')
            setShowMovementModal(false)
            setMovementAsset(null)
            router.refresh()
          }}
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

  const acquisitionDate =
    typeof asset.acquisitionDate === 'string'
      ? new Date(asset.acquisitionDate)
      : asset.acquisitionDate

  const adjustedCost = originalCost + costAdjustment

  return {
    id: asset.id,
    name: asset.name,
    clientId: asset.clientId,

    categoryId: asset.category?.id ?? null,
    categoryName: asset.category?.name ?? null,
    description: asset.description ?? '',

    acquisitionDate,

    originalCost,
    costAdjustment,

    depreciationRate: Number(asset.depreciationRate),
    depreciationMethod: asset.depreciationMethod,

    adjustedCost,

    // This shape is for the edit form (master data), not period reporting:
    daysSinceAcquisition: calculateDaysSinceAcquisition(acquisitionDate),
    depreciationForPeriod: 0,
    netBookValue: adjustedCost
  }
}
