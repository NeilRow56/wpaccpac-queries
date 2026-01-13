// app/fixed-assets/page.tsx

import { enrichAssetWithPeriodCalculations } from '@/lib/asset-calculations'

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  assetCategories,
  assetPeriodBalances,
  clients,
  depreciationEntries,
  fixedAssets
} from '@/db/schema'
import { FixedAssetsTableWrapper } from './_components/fixed-assets-table-wrapper'
import { getCurrentAccountingPeriod } from '@/server-actions/accounting-periods'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function FixedAssetsPage({
  params
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  /* ----------------------- Get current accounting period ---------------------- */
  const period = await getCurrentAccountingPeriod(clientId)

  if (!period) {
    return (
      <div className='flex flex-col items-center gap-2 py-6'>
        <Calendar className='text-muted-foreground/50 h-8 w-8' />
        <p>No accounting period found</p>
        <p className='text-sm'>
          Create your first accounting period to get started.
        </p>
        <Link href={`/organisation/clients/${clientId}/accounting-periods`}>
          <Button variant='ghost' className='mb-4'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            <span className='text-primary'>Accouting periods</span>
          </Button>
        </Link>
      </div>
    )
  }
  const [rawAssets, client, categories, periodEntries, periodBalances] =
    await Promise.all([
      // Assets + category
      db
        .select({
          asset: fixedAssets,
          category: assetCategories
        })
        .from(fixedAssets)
        .leftJoin(
          assetCategories,
          eq(fixedAssets.categoryId, assetCategories.id)
        )
        .where(eq(fixedAssets.clientId, clientId)),

      // Client
      db
        .select({
          id: clients.id,
          name: clients.name
        })
        .from(clients)
        .where(eq(clients.id, clientId))
        .then(rows => rows[0]),

      // Categories for client
      db
        .select({
          id: assetCategories.id,
          name: assetCategories.name,
          clientId: assetCategories.clientId
        })
        .from(assetCategories)
        .where(eq(assetCategories.clientId, clientId)),

      // depreciation entries for this period
      db
        .select()
        .from(depreciationEntries)
        .where(eq(depreciationEntries.periodId, period.id)),

      // ✅ balances for this period
      db
        .select()
        .from(assetPeriodBalances)
        .where(eq(assetPeriodBalances.periodId, period.id))
    ])

  if (!client) {
    return <div>Client not found</div>
  }

  const depreciationByAssetId = new Map(
    periodEntries.map(entry => [entry.assetId, entry])
  )

  const assetsWithCategory = rawAssets.map(row => ({
    ...row.asset,
    category: row.category
  }))

  const balancesByAssetId = new Map(periodBalances.map(b => [b.assetId, b]))

  const enrichedAssets = assetsWithCategory.map(asset =>
    enrichAssetWithPeriodCalculations(asset, {
      period: {
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate)
      },
      depreciationByAssetId,
      balancesByAssetId // ✅ add
    })
  )

  const formatDate = (d: Date | string) =>
    new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(d))

  const periodLabel = `Period ended ${formatDate(period.endDate)}`

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h2 className='text-primary text-lg font-bold'>
            Fixed Assets Register
          </h2>
          <p className='text-muted-foreground mt-2 flex flex-col'>
            <span>
              View and manage your client&apos;s fixed assets with real-time
              depreciation calculations.
            </span>
            <span>
              {' '}
              <span className='text-red-600/50'>
                NB: Add your asset categories before adding assets.
              </span>
            </span>
          </p>
        </div>
      </div>
      <FixedAssetsTableWrapper
        assets={enrichedAssets}
        period={period}
        periodLabel={periodLabel} // ✅ add
        clientName={client.name} // ✅ add
        clientId={client.id}
        categories={categories}
      />
      <div className='text-muted-foreground mt-6 flex-col space-x-4 pl-8'></div>
    </div>
  )
}
