'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// import { InvitesTab } from "./invites-tab"
// import { SubscriptionsTab } from "./subscriptions-tab"
import { authClient } from '@/lib/auth-client'
import { MembersTab } from './members-tab'
import { InvitesTab } from './invites-tab'

type OrganizationTabsProps = {
  canAccessAdmin: boolean
}

export function OrganizationTabs({ canAccessAdmin }: OrganizationTabsProps) {
  const { data: activeOrganization } = authClient.useActiveOrganization()

  return (
    <div className='space-y-4'>
      {activeOrganization && (
        <Tabs defaultValue='members' className='w-full'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='members'>Members</TabsTrigger>
            <TabsTrigger value='invitations'>Invitations</TabsTrigger>
            <TabsTrigger value='subscriptions'>Subscriptions</TabsTrigger>
          </TabsList>
          <Card>
            <CardContent>
              <TabsContent value='members'>
                <MembersTab canAccessAdmin={canAccessAdmin} />
              </TabsContent>
              <TabsContent value='invitations'>
                <InvitesTab />
              </TabsContent>
              {/* <SubscriptionsTab /> */}

              <TabsContent value='subscriptions'>Subscriptions</TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      )}
    </div>
  )
}
