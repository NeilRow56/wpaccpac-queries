// app/fixed-assets/page.tsx

import { db } from '@/db'
import { clients, fixedAssets } from '@/db/schema'
import { enrichAssetWithCalculations } from '@/lib/asset-calculations'
import { FixedAssetsTableWrapper } from './_components/fixed-assets-table-wrapper'

export default async function FixedAssetsPage() {
  // Fetch assets and clients
  const [rawAssets, allClients] = await Promise.all([
    db.select().from(fixedAssets),
    db
      .select({
        id: clients.id,
        name: clients.name
      })
      .from(clients)
  ])

  const assetsWithCalculations = rawAssets.map(enrichAssetWithCalculations)

  return (
    <div className='container mx-auto py-10'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold'>Fixed Assets Register</h1>
        <p className='text-muted-foreground mt-2'>
          View and manage your organization&apos;s fixed assets with real-time
          depreciation calculations
        </p>
      </div>
      <FixedAssetsTableWrapper
        assets={assetsWithCalculations}
        clients={allClients}
      />
    </div>
  )
}
