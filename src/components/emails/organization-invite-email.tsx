import { APP_ADDRESS1, APP_ADDRESS2, APP_NAME } from '@/lib/constants'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text
} from '@react-email/components'

type OrganizationInvitationEmailProps = {
  email: string
  invitedByUsername: string | null
  invitedByEmail: string
  teamName: string
  inviteLink: string
}

const sendOrganizationInviteEmail = ({
  email,
  invitedByUsername,
  invitedByEmail,
  teamName,
  inviteLink
}: OrganizationInvitationEmailProps) => {
  const displayName = invitedByUsername || invitedByEmail || 'A team member'

  return (
    <Html dir='ltr' lang='en'>
      <Tailwind>
        <Head />
        <Preview>You’ve been invited to join {teamName}</Preview>

        <Body className='bg-gray-100 py-10 font-sans'>
          <Container className='rounded-2 mx-auto max-w-[600px] bg-white p-10 shadow-sm'>
            {/* Header */}
            <Section className='mb-8 text-center'>
              <Heading className='m-0 mb-2 text-[28px] font-bold text-gray-900'>
                You’re invited to join {teamName}!
              </Heading>
              <Text className='m-0 text-base text-gray-600'>
                Collaborate with your team and access shared tools.
              </Text>
            </Section>

            {/* Main Content */}
            <Section className='mb-8'>
              <Text className='m-0 mb-4 text-base text-gray-700'>
                Hi there,
              </Text>

              <Text className='m-0 mb-4 text-base leading-relaxed text-gray-700'>
                <strong>{displayName}</strong> ({invitedByEmail}) has invited
                you to join <strong>{teamName}</strong> on {APP_NAME}.
              </Text>

              <Text className='m-0 mb-6 text-base leading-relaxed text-gray-700'>
                Accept this invitation to work with your team members,
                collaborate efficiently, and access all shared resources within
                your organization.
              </Text>
            </Section>

            {/* CTA Button */}
            <Section className='mb-10 text-center'>
              <Button
                className='inline-block rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white no-underline'
                href={inviteLink}
              >
                Accept Invitation
              </Button>
            </Section>

            {/* Secondary Link */}
            <Section className='mb-10'>
              <Text className='m-0 mb-2 text-sm text-gray-600'>
                If the button above doesn’t work, use the link below:
              </Text>
              <Text className='m-0 text-sm break-all'>
                <Link className='text-blue-600 underline' href={inviteLink}>
                  {inviteLink}
                </Link>
              </Text>
            </Section>

            {/* Details Section */}
            <Section className='mb-8 border-t border-gray-200 pt-6'>
              <Text className='m-0 mb-2 text-sm text-gray-700'>
                <strong>Organization:</strong> {teamName}
              </Text>
              <Text className='m-0 mb-2 text-sm text-gray-700'>
                <strong>Invited by:</strong> {displayName} ({invitedByEmail})
              </Text>
              <Text className='m-0 text-sm text-gray-700'>
                <strong>Your email:</strong> {email}
              </Text>
            </Section>

            {/* Footer */}
            <Section className='mt-8 border-t border-gray-200 pt-6'>
              <Text className='m-0 mb-2 text-center text-xs text-gray-500'>
                This invitation was sent to {email}. If you weren’t expecting
                this, you may ignore it.
              </Text>

              <Text className='m-0 text-center text-xs leading-4 text-gray-400'>
                {APP_NAME}
                <br />
                {APP_ADDRESS1}
                <br />
                {APP_ADDRESS2}
              </Text>

              <Text className='m-0 mt-2 text-center text-xs leading-4 text-gray-400'>
                © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default sendOrganizationInviteEmail
