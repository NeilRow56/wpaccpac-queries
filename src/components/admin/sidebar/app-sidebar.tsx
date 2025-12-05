'use client'

import * as React from 'react'

import {
  IconDashboard,
  IconListDetails,
  IconSettings,
  IconUsers
} from '@tabler/icons-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import Link from 'next/link'
import Image from 'next/image'
import { UserDropdown } from '@/components/site-home/user-dropdown'
import { NavSecondary } from './nav-secondary'
import { NavMain } from './nav-main'
import { authClient } from '@/lib/auth-client'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: IconDashboard
    },
    {
      title: 'Clients',
      url: '/clients',
      icon: IconListDetails
    },
    // {
    //   title: 'Accounts Periods',
    //   url: '/accounts-periods',
    //   icon: IconListDetails
    // },

    {
      title: 'Team',
      url: '/team',
      icon: IconUsers
    }
  ],
  // navClouds: [
  //   {
  //     title: 'Capture',
  //     icon: IconCamera,
  //     isActive: true,
  //     url: '#',
  //     items: [
  //       {
  //         title: 'Active Proposals',
  //         url: '#'
  //       },
  //       {
  //         title: 'Archived',
  //         url: '#'
  //       }
  //     ]
  //   },
  //   {
  //     title: 'Proposal',
  //     icon: IconFileDescription,
  //     url: '#',
  //     items: [
  //       {
  //         title: 'Active Proposals',
  //         url: '#'
  //       },
  //       {
  //         title: 'Archived',
  //         url: '#'
  //       }
  //     ]
  //   },
  //   {
  //     title: 'Prompts',
  //     icon: IconFileAi,
  //     url: '#',
  //     items: [
  //       {
  //         title: 'Active Proposals',
  //         url: '#'
  //       },
  //       {
  //         title: 'Archived',
  //         url: '#'
  //       }
  //     ]
  //   }
  // ],
  navSecondary: [
    {
      title: 'Settings',
      url: '/settings',
      icon: IconSettings
    }
    // {
    //   title: 'Get Help',
    //   url: '#',
    //   icon: IconHelp
    // },
    // {
    //   title: 'Search',
    //   url: '#',
    //   icon: IconSearch
    // }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession()

  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className='data-[slot=sidebar-menu-button]:p-1.5!'
            >
              <Link href='/'>
                <Image src='/logo.svg' alt='logo' width={32} height={32} />
                <div className=''>
                  <span className='text-sm text-yellow-600'>Wp</span>
                  <span className='text-sm'>AccPac</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />

        <NavSecondary items={data.navSecondary} className='mt-auto' />
      </SidebarContent>
      <SidebarFooter className='mb-16 items-start'>
        <UserDropdown
          name={session?.user.name || ' '}
          email={session?.user.email || ' '}
          image={session?.user.image || ''}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
