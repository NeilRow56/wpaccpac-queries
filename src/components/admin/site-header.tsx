import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { UsersRound } from 'lucide-react'
import { ModeToggle } from '../mode-toggle'
import { NavButtonMenu } from './nav-button-memu'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCurrentOrganization } from '@/server-actions/organizations'

export async function SiteHeader() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) redirect('/auth')

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
          <h3 className='ml-24 text-2xl font-bold'>
            {organization
              ? `Active organization: ${organization?.name} `
              : 'Administrator needs to create organization'}
          </h3>
        </div>
        <div className='ml-auto flex items-center gap-2'>
          <NavButtonMenu
            icon={UsersRound}
            label='Customers Menu'
            choices={[
              { title: 'Search Clients', href: '/clients/search' },
              { title: 'New Client', href: '/clients/form' }
            ]}
          />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
