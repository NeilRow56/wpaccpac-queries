'use client'

import { usePathname } from 'next/navigation'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'
import Link from 'next/link'

export function ClientNavMain({
  items
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map(item => {
          const isSectionActive =
            pathname === item.url || pathname.startsWith(item.url + '/')

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isSectionActive}
              className='group/collapsible'
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isSectionActive}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {item.items?.length && (
                      <ChevronDown className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180' />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                {item.items?.length && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map(subItem => {
                        const isItemActive = pathname === subItem.url

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isItemActive}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
