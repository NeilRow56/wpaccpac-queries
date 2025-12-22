import { ReturnButton } from '@/components/shared/return-button'

import { UserTable } from './_components/user-table'
import { getUISession } from '@/lib/get-ui-session'
import { redirect } from 'next/navigation'

export default async function AdministratorPage() {
  // 1️⃣ Get full TS-safe UI session
  const { user, ui } = await getUISession()

  if (!user?.isSuperUser) {
    redirect('/dashboard')
  }

  // 3️⃣ Check permissions
  if (!ui.canAccessAdmin) {
    throw new Error('You are not allowed to create an organization')
  }
  return (
    <div>
      {user.isSuperUser === true ? (
        <div className='container mx-auto max-w-5xl space-y-8 px-8 py-16'>
          <div className='space-y-4'>
            {/* <ReturnButton href='/s' label='Settings' /> */}

            <h1 className='text-3xl font-bold'>Super user - User Table</h1>

            <p className='rounded-md bg-green-600 p-2 text-lg font-bold text-white'>
              ACCESS GRANTED
            </p>
          </div>

          <div className='w-full overflow-x-auto'>
            <UserTable />
          </div>
        </div>
      ) : (
        <div className='container mx-auto max-w-5xl space-y-8 px-8 py-16'>
          <div className='space-y-4'>
            <ReturnButton href='/settings' label='Settings' />

            <h1 className='text-3xl font-bold'>Admin - User Table</h1>

            <p className='rounded-md bg-red-600 p-2 text-lg font-bold text-white'>
              FORBIDDEN
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
