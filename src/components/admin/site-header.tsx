import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { UsersRound } from 'lucide-react'
import { ModeToggle } from '../mode-toggle'
import { NavButtonMenu } from './nav-button-memu'

import { getCurrentOrganization } from '@/server-actions/organizations'
import { Button } from '../ui/button'
import Link from 'next/link'
import { getUISession } from '@/lib/get-ui-session'

export async function SiteHeader() {
  // 1. Ensure logged in
  // 1️⃣ Get full TS-safe UI session
  const { user } = await getUISession()

  if (!user) {
    throw new Error('User not found or not authenticated')
  }

  const organization = await getCurrentOrganization()

  return (
    <header className='flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)'>
      <div className='container mx-auto flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6'>
        <SidebarTrigger className='-ml-1' />
        <Separator
          orientation='vertical'
          className='mx-2 data-[orientation=vertical]:h-4'
        />
        <div className='font-bold'>
          <span className='text-xl text-yellow-600 md:text-2xl'>Wp</span>
          <span className='text-xl md:text-2xl'>AccPac</span>
        </div>

        <div className='hidden lg:flex'>
          <h3
            className={`lg:text-2xxl ml-24 text-xl font-bold ${
              organization ? 'text-primary' : 'text-red-600'
            }`}
          >
            {organization
              ? `Active organization: ${organization?.name}`
              : 'Administrator needs to create organization'}
          </h3>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          {user.isSuperUser && (
            <Button variant='outline' asChild size='lg'>
              <Link href='/protected'>Protected</Link>
            </Button>
          )}

          <NavButtonMenu
            icon={UsersRound}
            label='Customers Menu'
            choices={[
              { title: 'Clients', href: '/clients' },
              { title: 'Cost centres', href: '/costCentres' }
            ]}
          />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
