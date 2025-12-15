import data from './data.json'

import { SectionCards } from '@/components/admin/sidebar/section-cards'
import { DataTable } from '@/components/admin/sidebar/data-table'
import { ChartAreaInteractive } from '@/components/admin/sidebar/chart-area-interactive'
import { getUISession } from '@/lib/get-ui-session'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // 1️⃣ Get full TS-safe UI session
  const { user } = await getUISession()

  if (!user) {
    redirect('/auth')
  }
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
