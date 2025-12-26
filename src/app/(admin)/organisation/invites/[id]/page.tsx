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

export default async function InvitationPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // ✅ Use raw auth session (NOT getUISession)
  const session = await auth.api.getSession({
    headers: await headers()
  })

  // Not logged in → redirect to auth with invite preserved
  if (!session) {
    redirect(`/auth?invite=${id}`)
  }

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
