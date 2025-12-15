import { Suspense } from 'react'

import { getActiveOrganization } from '@/server-actions/organizations'
import { getActiveOrganizationCostCentres } from '@/server-actions/cost-centres'

import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonArray } from '@/components/shared/skeleton'
import { SkeletonCustomerCard } from '@/components/shared/skeleton-customer-card'

import { OrganizationSchema } from '@/zod-schemas/organizations'

import { db } from '@/db'
import { count } from 'drizzle-orm'
import { costCentres } from '@/db/schema'
import { AddCostCentreButton } from './_components/add-cost-centre-button'
import CostCentreTable from './_components/cost-centre-table'
import { getUISession } from '@/lib/get-ui-session'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Cost centers'
}

export default async function CostCentresPage() {
  // 1. Ensure logged in
  // 1️⃣ Get full TS-safe UI session
  const { user } = await getUISession()

  if (!user) {
    redirect('/auth')
  }

  const userId = user.id

  const organization = await getActiveOrganization(userId)

  if (organization === null) return 'Please select the active organization'

  // Validate & type it using Zod

  const org = OrganizationSchema.parse(organization)

  type Result = { count: number }
  const dbCount = await db.select({ count: count() }).from(costCentres)

  const arr: Result[] = dbCount

  const total: number = arr.reduce((sum, result) => sum + result.count, 0)

  const data = await getActiveOrganizationCostCentres(org.id)

  if (data.length === 0) {
    return (
      <>
        <div className='mx-auto mt-24 flex max-w-6xl flex-col gap-2'>
          <EmptyState
            title='Cost centers'
            description='You do not have any cost centers yet. Click on the button below to create your first cost center'
          />
        </div>

        <div className='- mt-12 flex w-full justify-center'>
          <AddCostCentreButton organization={org} />
        </div>
      </>
    )
  }

  return (
    <>
      <div className='container mx-auto max-w-6xl py-5'>
        <Suspense
          fallback={
            <SkeletonArray amount={3}>
              <SkeletonCustomerCard />
            </SkeletonArray>
          }
        >
          <CostCentreTable data={data} total={total} organization={org} />
        </Suspense>
        <div className='text-muted-foreground flex-col space-x-4 pl-8'>
          <span className='text-red-600'>NB: </span>
          <p>
            Cost centers cannot be deleted, only edited. If the cost centre for
            a client changes e.g. on the retirement of a partner, select the new
            cost centre for the client by using the edit function under Actions
            in the Clients table.
          </p>
          <p className='pt-4'>
            If a client now falls under a completely new cost centre create a
            new entry, using the button above. Then use the the edit function
            under Actions in the Clients table to ensure the correct client
            allocation.
          </p>
          <p className='pt-4'>
            Any problems please contact:
            <span className='pl-2 text-blue-600'>admin@wpaccpac.org</span>
          </p>
        </div>
      </div>
    </>
  )
}
