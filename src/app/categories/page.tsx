import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import { db } from '@/db'
import { categories } from '@/db/schema'
import { count } from 'drizzle-orm'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonCustomerCard } from '@/components/shared/skeleton-customer-card'
import { SkeletonArray } from '@/components/shared/skeleton'
import { getCurrentUserId, getUserDetails } from '@/server-actions/users'
import { BackButton } from '@/components/shared/back-button'
import { getCategoriesByUserId } from '@/server-actions/categories'
import { AddCategoryButton } from './_components/add-category-button'
import CategoriesTable from './_components/categories-table'

export const metadata = {
  title: 'Category Search'
}

export default async function Categories() {
  const { userId } = await getCurrentUserId()
  if (userId == null) return redirect('/auth/sign-in')

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

    const data = await getCategoriesByUserId(userId)
    type Result = { count: number }
    const dbCount = await db.select({ count: count() }).from(categories)

    const arr: Result[] = dbCount

    const total: number = arr.reduce((sum, result) => sum + result.count, 0)

    if (data.length === 0) {
      return (
        <>
          <div className='mx-auto mt-24 flex max-w-6xl flex-col gap-2'>
            <EmptyState
              title='Categories'
              description='You have no categories yet. Click on the button below to create your first category'
            />
          </div>

          <div className='- mt-12 flex w-full justify-center'>
            <AddCategoryButton user={user} />
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
            <CategoriesTable data={data} total={total} user={user} />
          </Suspense>
        </div>
      </>
    )
  }
}
