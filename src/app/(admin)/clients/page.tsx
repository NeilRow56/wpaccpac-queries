// src/app/(admin)/clients/page.tsx
import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { getCurrentUserId, getUserDetails } from '@/server-actions/users'
import { getActiveOrganization } from '@/server-actions/organizations'
import { getActiveOrganizationClients } from '@/server-actions/clients'
import { getActiveOrganizationCostCentres } from '@/server-actions/cost-centres'

import { BackButton } from '@/components/shared/back-button'
import { ReturnButton } from '@/components/shared/return-button'
import { AddClientButton } from './_components/add-client-button'

// import { EmptyState } from '@/components/shared/empty-state'
import { SkeletonArray } from '@/components/shared/skeleton'
import { SkeletonCustomerCard } from '@/components/shared/skeleton-customer-card'

import { OrganizationSchema } from '@/zod-schemas/organizations'
import { entity_types } from '@/lib/constants'

export const metadata = {
  title: 'Client Search'
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

  // 3. Resolve active organization (server action). This should return the organization object or null.
  const organization = await getActiveOrganization(userId)

  if (!organization) {
    // no active organization: redirect to organizations list (or show a message)
    redirect('/organization')
  }

  // Validate & type it using Zod (throws if invalid)
  const org = OrganizationSchema.parse(organization)

  // 4. Load supporting data for the page
  const [orgCostCentres, clientsData] = await Promise.all([
    getActiveOrganizationCostCentres(org.id),
    getActiveOrganizationClients(org.id)
  ])

  // 5. Create a lookup map from id -> description
  const entityTypeMap: Record<string, string> = Object.fromEntries(
    entity_types.map(et => [et.id, et.description])
  )

  // 6. If no clients, show EmptyState + Add button
  if (!clientsData || clientsData.length === 0) {
    return (
      <div className='container mx-auto max-w-5xl px-8 py-16'>
        <div className='space-y-4'>
          <ReturnButton href='/organization' label='Organizations' />

          <h1 className='text-3xl font-bold'>Clients</h1>

          <p className='text-lg'>
            You have no clients yet for the active organization.
          </p>

          <div className='mt-8'>
            <AddClientButton
              organization={org}
              orgCostCentres={orgCostCentres}
            />
          </div>
        </div>
      </div>
    )
  }

  // 6. Otherwise render the clients area (replace placeholder with your real table component)
  return (
    <div className='container mx-auto max-w-6xl py-10'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Clients</h1>
        <AddClientButton organization={org} orgCostCentres={orgCostCentres} />
      </div>

      <Suspense
        fallback={
          <SkeletonArray amount={3}>
            <SkeletonCustomerCard />
          </SkeletonArray>
        }
      >
        {/* TODO: replace this placeholder with your actual ClientTable / DataTable component */}
        <div className='rounded-md border p-6'>
          <p className='mb-4'>
            Client Table Placeholder — replace with your real table component.
          </p>

          <table className='w-full table-fixed'>
            <thead>
              <tr className='text-left'>
                <th className='pb-2'>Name</th>
                <th className='pb-2'>Entity Type</th>
                <th className='pb-2'>Cost Centre</th>
                <th className='pb-2'>Active</th>
              </tr>
            </thead>
            <tbody>
              {clientsData.map(c => (
                <tr key={c.id} className='border-t'>
                  <td className='py-2'>{c.name}</td>
                  <td className='py-2'>
                    {entityTypeMap[c.entity_type] || c.entity_type}
                  </td>
                  <td className='py-2'>{c.cost_centre_name}</td>
                  <td className='py-2'>{c.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Suspense>
    </div>
  )
}
