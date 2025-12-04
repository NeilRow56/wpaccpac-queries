import { auth } from '@/lib/auth'
import { getOrganizations } from '@/server-actions/organizations'
import { headers } from 'next/headers'
// import { db } from '@/db'
// import { count } from 'drizzle-orm'

import { EmptyState } from '@/components/shared/empty-state'
import { AddOrganizationButton } from './_components/add-organization-button'
import { Suspense } from 'react'
import { SkeletonArray } from '@/components/shared/skeleton'
import { SkeletonCustomerCard } from '@/components/shared/skeleton-customer-card'

// import { organization } from '@/db/schema'
import { redirect } from 'next/navigation'
import { OrganizationTabs } from './_components/organization-tabs'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { OrganizationSelect } from './_components/organization-select'

export default async function OrganizationPage() {
  const organizations = await getOrganizations()
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if (session == null) return redirect('/auth')

  // type Result = { count: number }
  // const dbCount = await db.select({ count: count() }).from(organization)

  // const arr: Result[] = dbCount

  // const total: number = arr.reduce((sum, result) => sum + result.count, 0)

  if (organizations.length === 0) {
    return (
      <>
        <div className='mx-auto mt-24 flex max-w-6xl flex-col gap-2'>
          <EmptyState
            title='Organizations'
            description='You have no organizations yet. Click on the button below to create your first organization'
          />
        </div>

        <div className='- mt-12 flex w-full justify-center'>
          <AddOrganizationButton />
        </div>
      </>
    )
  }
  return (
    <>
      <div className='container mx-auto max-w-2xl py-10'>
        <Link href='/' className='mb-6 inline-flex items-center'>
          <ArrowLeft className='mr-2 size-4' />
          <span className='text-primary'>Back to Home</span>
        </Link>
        <div className='mt-12 mb-2 space-y-2'>
          <h2 className='font-bold'>Organizations:</h2>
          <h3 className='text-primary/90 text-sm'>
            Select active organization
          </h3>
        </div>
        <div className='mb-8 flex items-center gap-2'>
          <OrganizationSelect />
          {session.user.role !== 'user' && <AddOrganizationButton />}
        </div>
        <Suspense
          fallback={
            <SkeletonArray amount={3}>
              <SkeletonCustomerCard />
            </SkeletonArray>
          }
        >
          <OrganizationTabs />
        </Suspense>
      </div>
    </>
  )
}
