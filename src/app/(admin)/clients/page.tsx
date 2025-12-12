// src/app/(admin)/clients/page.tsx
import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { getCurrentUserId, getUserDetails } from '@/server-actions/users'
import { getActiveOrganization } from '@/server-actions/organizations'
import {
  getActiveOrganizationClients,
  ClientServer
} from '@/server-actions/clients'
import { getActiveOrganizationCostCentres } from '@/server-actions/cost-centres'

import { BackButton } from '@/components/shared/back-button'
import { AddClientButton } from './_components/add-client-button'
import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonArray } from '@/components/shared/skeleton'
import { SkeletonCustomerCard } from '@/components/shared/skeleton-customer-card'

import { OrganizationSchema } from '@/zod-schemas/organizations'
import { db } from '@/db'
import { count } from 'drizzle-orm'
import { clients } from '@/db/schema'

import ClientTable from './_components/clients-table'
import { Client as TableClient } from './_components/columns' // frontend table type
import SuspenseWrapper from '@/components/shared/suspense-wrapper'

export const metadata = {
  title: 'Clients'
}

export default async function ClientsPage() {
  // 1. Ensure logged in
  const { userId } = await getCurrentUserId()
  if (!userId) return redirect('/auth')

  // 2. Load user details
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

  // 3. Resolve active organization
  const organization = await getActiveOrganization(userId)
  if (!organization) redirect('/organization')
  const org = OrganizationSchema.parse(organization)

  // 4. Load supporting data
  const [orgCostCentres, clientsServerData] = await Promise.all([
    getActiveOrganizationCostCentres(org.id),
    getActiveOrganizationClients(org.id)
  ])

  // 5. Map server ClientServer type → frontend TableClient type
  const clientsData: TableClient[] = clientsServerData.map(
    (c: ClientServer) => ({
      id: c.id,
      name: c.name,
      entity_type: c.entity_type,
      costCentreId: c.costCentreId,
      costCentreName: c.costCentreName ?? 'Unknown', // fallback if null
      organizationId: c.organizationId,
      notes: c.notes ?? '',
      active: c.active
    })
  )

  // 6. Compute total for pagination
  const dbCount = await db.select({ count: count() }).from(clients)
  const total: number = dbCount.reduce((sum, r) => sum + r.count, 0)

  // 7. Render empty state if no clients
  if (!clientsData || clientsData.length === 0) {
    return (
      <>
        <div className='mx-auto mt-24 flex max-w-6xl flex-col gap-2'>
          <EmptyState
            title='Clients'
            description='You do not have any clients yet. Click on the button below to create your first client'
          />
        </div>

        <div className='mt-12 flex w-full justify-center'>
          <AddClientButton
            organization={organization}
            orgCostCentres={orgCostCentres}
          />
        </div>
      </>
    )
  }

  // 8. Render clients table
  return (
    <div className='container mx-auto max-w-6xl py-5'>
      <SuspenseWrapper>
        <Suspense
          fallback={
            <SkeletonArray amount={3}>
              <SkeletonCustomerCard />
            </SkeletonArray>
          }
        >
          <ClientTable
            data={clientsData}
            total={total}
            organization={org}
            orgCostCentres={orgCostCentres}
          />
        </Suspense>
      </SuspenseWrapper>
      <div className='text-muted-foreground mt-6 flex-col space-x-4 pl-8'>
        <span className='text-red-600'>NB: </span>
        <p>
          Clients cannot be deleted, only edited. This is to ensure you always
          have access to the data. If a client is no longer Active change the
          status to Archived using the edit function under Actions and
          unchecking the active checkbox.
        </p>

        <p className='pt-4'>
          Any problems please contact:
          <span className='pl-2 text-blue-600'>admin@wpaccpac.org</span>
        </p>
      </div>
    </div>
  )
}
