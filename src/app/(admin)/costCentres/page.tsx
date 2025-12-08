import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { getCurrentUserId, getUserDetails } from '@/server-actions/users'
import { BackButton } from '@/components/shared/back-button'
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

export const metadata = {
  title: 'Cost centers'
}

export default async function CostCentresPage() {
  const { userId } = await getCurrentUserId()
  if (userId == null) return redirect('/auth')

  if (userId) {
    const user = await getUserDetails(userId)

    if (!user) {
      return (
        <>
          <h2 className='mb-2 text-2xl'>User ID #{userId} not found</h2>
          <BackButton
            title='Go Back'
            variant='default'
            className='flex w-[100px]'
          />
        </>
      )
    }

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
        <div className='container mx-auto max-w-2xl py-10'>
          <Suspense
            fallback={
              <SkeletonArray amount={3}>
                <SkeletonCustomerCard />
              </SkeletonArray>
            }
          >
            <CostCentreTable data={data} total={total} organization={org} />
          </Suspense>
        </div>
      </>
    )
  }
}
