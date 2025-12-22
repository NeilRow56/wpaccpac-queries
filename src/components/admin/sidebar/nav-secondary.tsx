'use client'

import * as React from 'react'
import { type Icon } from '@tabler/icons-react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { Settings } from 'lucide-react'

interface NavSecondaryProps extends React.ComponentPropsWithoutRef<
  typeof SidebarGroup
> {
  items: {
    title: string
    url: string
    icon: Icon
  }[]
  ui?: {
    canAccessAdmin: boolean
  }
}

export function NavSecondary({ ui, items, ...props }: NavSecondaryProps) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        {ui?.canAccessAdmin && (
          <SidebarMenu>
            {items.map(item => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <a href='/settings'>
              <Settings />
              <span>Settings</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
