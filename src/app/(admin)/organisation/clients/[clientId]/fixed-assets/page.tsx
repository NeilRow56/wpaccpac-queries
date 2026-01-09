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

export default async function FixedAssetsPage({
  params
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  /* ----------------------- Get current accounting period ---------------------- */
  const period = await getCurrentAccountingPeriod(clientId)

  if (!period) {
    return <div>No open accounting period</div>
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

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h2 className='text-primary text-lg font-bold'>
            Fixed Assets Register
          </h2>
          <p className='text-muted-foreground mt-2'>
            View and manage your client&apos;s fixed assets with real-time
            depreciation calculations
          </p>
        </div>
      </div>
      <FixedAssetsTableWrapper
        assets={enrichedAssets}
        period={period}
        clientId={client.id}
        categories={categories}
      />
      <div className='text-muted-foreground mt-6 flex-col space-x-4 pl-8'></div>
    </div>
  )
}
