import { ReturnButton } from '@/components/shared/return-button'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { UserTable } from './_components/user-table'

export default async function AdministratorPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) redirect('/auth')
  return (
    <div>
      {session.user.isSuperUser === true ? (
        <div className='container mx-auto max-w-5xl space-y-8 px-8 py-16'>
          <div className='space-y-4'>
            <ReturnButton href='/settings' label='Settings' />

            <h1 className='text-3xl font-bold'>Admin - User Table</h1>

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
