import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { auth } from '@/lib/auth'
import { ArrowLeftIcon, Key, User } from 'lucide-react'
import { headers } from 'next/headers'

import Link from 'next/link'

import { ProfileUpdateForm } from './_components/profile-update-form'
import { SessionManagement } from './_components/session-management'

import { LoadingSuspense } from '@/components/shared/loading-suspense'
import { getUISession } from '@/lib/get-ui-session'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

export default async function ProfileSettingsPage() {
  const { session, user } = await getUISession()

  if (!user) {
    redirect('/auth')
  }

  //requireSession guarantees non-null (because it redirects when session is null).

  //assert to TS that this is always true:
  //e./g. session!.user

  return (
    <div className='mx-auto my-12 max-w-4xl px-4'>
      <div className='mb-8'>
        <Link href='/' className='mb-6 inline-flex items-center'>
          <ArrowLeftIcon className='mr-2 size-4' />
          <span className='text-primary'>Back to Home</span>
        </Link>
        <div className='mt-12 flex items-center space-x-4'>
          <div className='bg-muted flex size-16 items-center justify-center overflow-hidden rounded-full'>
            <User className='text-muted-foreground size-8' />
          </div>
          <div className='flex-1 items-center'>
            <div className='flex items-center justify-between gap-1'>
              <h1 className='text-3xl font-bold'>
                {user.name || 'User Profile'}
              </h1>
              <Badge className='bg-teal-600'>{user.orgRole}</Badge>
            </div>
            <p className='text-blue-500'>{user.email}</p>
          </div>
        </div>
      </div>
      {/*  */}
      <Tabs className='space-y-2' defaultValue='profile'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='profile'>
            <User />
            <span className='max-sm:hidden'>Profile</span>
          </TabsTrigger>

          <TabsTrigger value='sessions'>
            <Key />
            <span className='max-sm:hidden'>Sessions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='profile'>
          <Card>
            <CardContent>
              <ProfileUpdateForm user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='sessions'>
          <LoadingSuspense>
            <SessionsTab currentSessionToken={session!.session!.token} />
          </LoadingSuspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

async function SessionsTab({
  currentSessionToken
}: {
  currentSessionToken: string
}) {
  const sessions = await auth.api.listSessions({ headers: await headers() })

  return (
    <Card>
      <CardContent>
        <SessionManagement
          sessions={sessions}
          currentSessionToken={currentSessionToken}
        />
      </CardContent>
    </Card>
  )
}
