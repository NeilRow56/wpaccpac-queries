import data from './data.json'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ReturnButton } from '@/components/shared/return-button'
import { SectionCards } from '@/components/admin/sidebar/section-cards'
import { DataTable } from '@/components/admin/sidebar/data-table'
import { ChartAreaInteractive } from '@/components/admin/sidebar/chart-area-interactive'

export default async function DashboardPage() {
  const headersList = await headers()

  const session = await auth.api.getSession({
    headers: headersList
  })
  if (!session) redirect('/auth')

  if (session.user.role !== 'admin') {
    return (
      <div className='container mx-auto max-w-5xl space-y-8 px-8 py-16'>
        <div className='space-y-4'>
          <ReturnButton href='/profile' label='Profile' />

          <h1 className='text-3xl font-bold'>Admin Dashboard</h1>

          <p className='rounded-md bg-red-600 p-2 text-lg font-bold text-white'>
            NOT AUTHORISED
          </p>
        </div>
      </div>
    )
  }
  return (
    <>
      <SectionCards />
      <div className='px-4 lg:px-6'>
        <ChartAreaInteractive />
      </div>
      <DataTable data={data} />
    </>
  )
}
