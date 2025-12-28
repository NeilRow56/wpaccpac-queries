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
            item.items?.some(sub => pathname === sub.url) ||
            pathname === item.url

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
                    isActive={isSectionActive}
                    data-active={isSectionActive ? 'section' : undefined}
                    className='data-[active=section]:bg-sidebar-accent data-[active=section]:text-sidebar-accent-foreground relative pl-4'
                  >
                    <span
                      className='data-[active=section]:bg-sidebar-accent-foreground/50 absolute top-0 left-0 h-full w-1 bg-transparent transition-colors'
                      data-active={isSectionActive ? 'section' : undefined}
                    />
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {item.items?.length && (
                      <ChevronDown className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180' />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                {item.items?.length && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map(subItem => {
                        const isPageActive = pathname === subItem.url

                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              data-active={isPageActive ? 'page' : undefined}
                              className='data-[active=page]:bg-primary/10 data-[active=page]:text-primary relative pl-4'
                            >
                              <Link
                                href={subItem.url}
                                className='relative flex w-full items-center'
                              >
                                <span
                                  className='data-[active=page]:bg-primary absolute top-0 left-0 h-full w-1 bg-transparent transition-colors'
                                  data-active={
                                    isPageActive ? 'page' : undefined
                                  }
                                />
                                <span
                                  className={
                                    isPageActive ? 'font-medium' : undefined
                                  }
                                >
                                  {subItem.title}
                                </span>
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
