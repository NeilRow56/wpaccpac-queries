import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { InviteInformation } from './_components/invite-information'
import { auth } from '@/lib/auth'
import { getUISession } from '@/lib/get-ui-session'

export default async function InvitationPage({
  params
}: PageProps<'/organization/invites/[id]'>) {
  const { session } = await getUISession()

  if (session == null) return redirect('/auth')

  const { id } = await params

  const invitation = await auth.api
    .getInvitation({
      headers: await headers(),
      query: { id }
    })
    .catch(() => redirect('/'))

  return (
    <div className='container mx-auto my-6 max-w-2xl px-4'>
      <Card>
        <CardHeader>
          <CardTitle>Organization Invitation</CardTitle>
          <CardDescription>
            You have been invited to join the {invitation.organizationName}{' '}
            organization as a {invitation.role}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteInformation invitation={invitation} />
        </CardContent>
      </Card>
    </div>
  )
}
