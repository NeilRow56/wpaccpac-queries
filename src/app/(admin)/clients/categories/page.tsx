import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { getCurrentUserId, getUserDetails } from '@/server-actions/users'
import { BackButton } from '@/components/shared/back-button'
import { getActiveOrganization } from '@/server-actions/organizations'
import { getActiveOrganizationClientCategories } from '@/server-actions/cost-centres'

import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonArray } from '@/components/shared/skeleton'
import { SkeletonCustomerCard } from '@/components/shared/skeleton-customer-card'

import { OrganizationSchema } from '@/zod-schemas/organizations'
import { AddClientCategoryButton } from './_components/add-client-category-button'
import { db } from '@/db'
import { count } from 'drizzle-orm'
import { clientCategories } from '@/db/schema'
import ClientCategoriesTable from './_components/client-categories-table'
import { ReturnButton } from '@/components/shared/return-button'

export const metadata = {
  title: 'Client Search'
}

export default async function Categories() {
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

    if (organization === null) {
      return (
        <div className='container mx-auto max-w-5xl space-y-8 px-8 py-16'>
          <div className='space-y-4'>
            <ReturnButton href='/organization' label='Organizations' />

            <h1 className='text-3xl font-bold'>
              Please select/set the active organization
            </h1>

            <p className='rounded-md bg-red-600 p-2 text-lg font-bold text-white'></p>
          </div>
        </div>
      )
    }

    // Validate & type it using Zod

    const org = OrganizationSchema.parse(organization)

    type Result = { count: number }
    const dbCount = await db.select({ count: count() }).from(clientCategories)

    const arr: Result[] = dbCount

    const total: number = arr.reduce((sum, result) => sum + result.count, 0)

    const data = await getActiveOrganizationClientCategories(org.id)

    if (data.length === 0) {
      return (
        <>
          <div className='mx-auto mt-24 flex max-w-6xl flex-col gap-2'>
            <EmptyState
              title='Client - Cost Center '
              description='You have no categories yet. Click on the button below to create your first category e.g Name of fee earner'
            />
          </div>

          <div className='- mt-12 flex w-full justify-center'>
            <AddClientCategoryButton organization={org} />
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
            <ClientCategoriesTable data={data} total={total} org={org} />
          </Suspense>
        </div>
      </>
    )
  }
}
