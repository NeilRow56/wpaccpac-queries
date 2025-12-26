// src/app/(admin)/clients/page.tsx
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getActiveOrganization } from '@/server-actions/organizations'
import {
  getActiveOrganizationClients,
  ClientServer
} from '@/server-actions/clients'
import { getActiveOrganizationCostCentres } from '@/server-actions/cost-centres'

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
import { getUISession } from '@/lib/get-ui-session'

export const metadata = {
  title: 'Clients'
}

export default async function ClientsPage() {
  // 1. Ensure logged in
  // 1️⃣ Get full TS-safe UI session
  const { user } = await getUISession()

  if (!user) {
    redirect('/auth')
  }

  const userId = user.id

  // 2. Resolve active organization
  const organization = await getActiveOrganization(userId)
  if (!organization) redirect('/organization')
  const org = OrganizationSchema.parse(organization)

  // 3. Load supporting data
  const [orgCostCentres, clientsServerData] = await Promise.all([
    getActiveOrganizationCostCentres(org.id),
    getActiveOrganizationClients(org.id)
  ])

  // 4. Map server ClientServer type → frontend TableClient type
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

  // 5. Compute total for pagination
  const dbCount = await db.select({ count: count() }).from(clients)
  const total: number = dbCount.reduce((sum, r) => sum + r.count, 0)

  // 6. Render empty state if no clients
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

  // 7. Render clients table
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
