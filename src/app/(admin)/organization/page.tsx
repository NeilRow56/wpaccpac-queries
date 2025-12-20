// src/app/(admin)/organization/page.tsx
import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { AddOrganizationButton } from './_components/add-organization-button'
import { OrganizationSelect } from './_components/organization-select'
import { OrganizationTabs } from './_components/organization-tabs'
// import OrganizationsTable from './_components/organizations-table'

import { SkeletonArray } from '@/components/shared/skeleton'
import { SkeletonCustomerCard } from '@/components/shared/skeleton-customer-card'
import { getUISession } from '@/lib/get-ui-session'
import { db } from '@/db'
import {
  member as memberTable,
  organization as organizationTable
} from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function OrganizationPage() {
  const { user, ui } = await getUISession()

  if (!user) {
    throw new Error('User not found or not authenticated')
  }

  const organizations = await db
    .select({
      id: organizationTable.id,
      name: organizationTable.name,
      slug: organizationTable.slug,
      role: memberTable.role
    })
    .from(memberTable)
    .innerJoin(
      organizationTable,
      eq(memberTable.organizationId, organizationTable.id)
    )
    .where(eq(memberTable.userId, user.id))

  // const data = organizations

  // console.log(data)

  // const tableOrgs = organizations.map(o => ({
  //   id: o.id,
  //   name: o.name,
  //   slug: o.slug
  // }))

  // 4️⃣ Calculate total organizations
  const total = organizations.length

  // 5️⃣ Render empty state if no organizations
  if (total === 0) {
    return (
      <>
        <div className='mx-auto mt-24 flex max-w-6xl flex-col gap-2'>
          <EmptyState
            title='Organizations'
            description='You have no organizations yet. Click on the button below to create your first organization'
          />
        </div>
        <div className='-mt-12 flex w-full justify-center'>
          <AddOrganizationButton sessionUserId={user.id} />
        </div>
      </>
    )
  }

  // 6️⃣ Render main page
  return (
    <div className='container mx-auto max-w-6xl py-10'>
      <Link href='/dashboard' className='mb-6 inline-flex items-center'>
        <ArrowLeft className='mr-2 size-4' />
        <span className='text-primary'>Back to Dashboard</span>
      </Link>

      <div className='mt-4 mb-8 space-y-2'>
        <h2 className='text-xl font-bold'>
          Organizations: (Normally the short form name for your business - but
          it can be anything)
        </h2>
      </div>

      <div className='mb-8 flex items-center gap-2'>
        <OrganizationSelect />
      </div>

      <Suspense
        fallback={
          <SkeletonArray amount={3}>
            <SkeletonCustomerCard />
          </SkeletonArray>
        }
      >
        <OrganizationTabs canAccessAdmin={ui.canAccessAdmin} />
        <div className='text-muted-foreground mt-4 flex-col space-x-4 pl-8'>
          <span className='text-red-600'>
            NB: Organization creation and amendment is only visible to
            &quot;admin&quot; users.
          </span>
          <p>
            Organizations cannot be deleted, only edited. This is to protect
            your data. All client information is linked to an organization.
          </p>
          <p className='flex flex-col pt-4'>
            In most cases a business will only have one organization.
            <span>
              Invite members of your team to join the organization once they
              have registered with the app.
            </span>
          </p>
          <p className='pt-4'>
            Any problems please contact:
            <span className='pl-2 text-blue-600'>admin@wpaccpac.org</span>
          </p>
        </div>
        <div className='container mx-auto py-10'></div>
      </Suspense>
    </div>
  )
}
