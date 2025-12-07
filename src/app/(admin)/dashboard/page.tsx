import data from './data.json'

import { redirect } from 'next/navigation'

import { SectionCards } from '@/components/admin/sidebar/section-cards'
import { DataTable } from '@/components/admin/sidebar/data-table'
import { ChartAreaInteractive } from '@/components/admin/sidebar/chart-area-interactive'
import { getSessionServer } from '@/lib/session'

export default async function DashboardPage() {
  const session = await getSessionServer() // server-side session
  if (!session) redirect('/auth')

  return (
    <div className='mx-auto w-full max-w-[2040px]'>
      <SectionCards />
      <div className='px-4 lg:px-6'>
        <ChartAreaInteractive />
      </div>
      <DataTable data={data} />
    </div>
  )
}
