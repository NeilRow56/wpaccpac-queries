// app/fixed-assets/page.tsx

import { enrichAssetWithCalculations } from '@/lib/asset-calculations'

import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FolderTree, Calendar } from 'lucide-react'
import { db } from '@/db'
import { assetCategories, clients, fixedAssets } from '@/db/schema'
import { FixedAssetsTableWrapper } from './_components/fixed-assets-table-wrapper'

export default async function FixedAssetsPage() {
  // Fetch assets with category info, clients, and all categories
  const [rawAssets, allClients, allCategories] = await Promise.all([
    db
      .select({
        asset: fixedAssets,
        category: assetCategories
      })
      .from(fixedAssets)
      .leftJoin(
        assetCategories,
        eq(fixedAssets.categoryId, assetCategories.id)
      ),
    db
      .select({
        id: clients.id,
        name: clients.name
      })
      .from(clients),
    db
      .select({
        id: assetCategories.id,
        name: assetCategories.name,
        clientId: assetCategories.clientId
      })
      .from(assetCategories)
  ])

  // Merge asset and category data
  const assetsWithCategory = rawAssets.map(row => ({
    ...row.asset,
    category: row.category
  }))

  const assetsWithCalculations = assetsWithCategory.map(
    enrichAssetWithCalculations
  )

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Fixed Assets Register</h1>
          <p className='text-muted-foreground mt-2'>
            View and manage your organization&apos;s fixed assets with real-time
            depreciation calculations
          </p>
        </div>
        <div className='flex gap-2'>
          <Link href='/fixedAssets/categories'>
            <Button variant='outline'>
              <FolderTree className='mr-2 h-4 w-4' />
              Manage Categories
            </Button>
          </Link>
          <Link href='/fixed-assets/periods'>
            <Button variant='outline'>
              <Calendar className='mr-2 h-4 w-4' />
              Manage Periods
            </Button>
          </Link>
        </div>
      </div>
      <FixedAssetsTableWrapper
        assets={assetsWithCalculations}
        clients={allClients}
        categories={allCategories}
      />
    </div>
  )
}
