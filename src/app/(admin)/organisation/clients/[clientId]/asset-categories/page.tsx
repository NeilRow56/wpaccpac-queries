// app/fixed-assets/categories/page.tsx

import { eq, sql } from 'drizzle-orm'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/db'
import { assetCategories, fixedAssets } from '@/db/schema'
import { CategoriesClient } from './categories-client'

export default async function AssetCategoriesPage({
  params
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  // Fetch categories with asset counts
  const categoriesWithCounts = await db
    .select({
      id: assetCategories.id,
      name: assetCategories.name,
      clientId: assetCategories.clientId,
      description: assetCategories.description,
      defaultDepreciationRate: assetCategories.defaultDepreciationRate,
      createdAt: assetCategories.createdAt,
      assetCount: sql<number>`count(${fixedAssets.id})::int`
    })
    .from(assetCategories)
    .leftJoin(fixedAssets, eq(assetCategories.id, fixedAssets.categoryId))
    .where(eq(assetCategories.clientId, clientId))
    .groupBy(assetCategories.id)
    .orderBy(assetCategories.name)

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8'>
        <Link href={`/organisation/clients/${clientId}/fixedAssets`}>
          <Button variant='ghost' className='mb-4'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            <span className='text-primary'>Back to Assets</span>
          </Button>
        </Link>

        <h1 className='text-3xl font-bold'>Asset Categories</h1>
        <p className='text-muted-foreground mt-2'>
          Manage asset categories to organize your fixed assets
        </p>
      </div>
      <CategoriesClient categories={categoriesWithCounts} clientId={clientId} />
    </div>
  )
}
