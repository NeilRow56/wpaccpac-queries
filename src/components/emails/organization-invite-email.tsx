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
  invitedByUsername: string
  invitedByEmail: string
  teamName: string
  inviteLink: string
}

const sendOrganizationInviteEmail = (
  props: OrganizationInvitationEmailProps
) => {
  return (
    <Html dir='ltr' lang='en'>
      <Tailwind>
        <Head />
        <Preview>You&apos;ve been invited to join {props.teamName}</Preview>
        <Body className='bg-gray-100 py-10 font-sans'>
          <Container className='rounded-2 mx-auto max-w-[600px] bg-white p-10 shadow-sm'>
            <Section>
              {/* Header */}
              <Section className='mb-8 text-center'>
                <Heading className='m-0 mb-2 text-[28px] font-bold text-gray-900'>
                  You&apos;re invited!
                </Heading>
                <Text className='text-4 m-0 text-gray-600'>
                  Join {props.teamName} and start collaborating
                </Text>
              </Section>

              {/* Main Content */}
              <Section className='mb-8 ml-9'>
                <Text className='text-4 m-0 mb-4 text-gray-700'>Hi there,</Text>
                <Text className='text-4 m-0 mb-4 text-gray-700'>
                  <strong>{props.invitedByUsername}</strong> (
                  {props.invitedByEmail}) has invited you to join{' '}
                  <strong>{props.teamName}</strong> on our platform.
                </Text>
                <Text className='text-4 m-0 mb-6 text-gray-700'>
                  Accept this invitation to start collaborating with your team
                  members and access all the tools and resources available in
                  your organization.
                </Text>
              </Section>

              {/* CTA Button */}
              <Section className='mb-8 text-center'>
                <Button
                  className='text-4 box-border inline-block rounded-[6px] bg-blue-600 px-6 py-3 font-medium text-white no-underline'
                  href={props.inviteLink}
                >
                  Accept Invitation
                </Button>
              </Section>

              {/* Alternative Link */}
              <Section className='mb-8 ml-6'>
                <Text className='m-0 mb-2 text-[14px] text-gray-600'>
                  If the button above doesn&apos;t work, you can also copy and
                  paste this link into your browser:
                </Text>
                <Text className='m-0 text-[14px] break-all'>
                  <Link
                    className='text-blue-600 underline'
                    href={props.inviteLink}
                  >
                    {props.inviteLink}
                  </Link>
                </Text>
              </Section>

              {/* Additional Info */}
              <Section className='mb-6 ml-6 border-t border-gray-200 pt-6'>
                <Text className='m-0 mb-2 text-[14px] text-gray-600'>
                  <strong>Organization:</strong> {props.teamName}
                </Text>
                <Text className='m-0 mb-2 text-[14px] text-gray-600'>
                  <strong>Invited by:</strong> {props.invitedByUsername} (
                  {props.invitedByEmail})
                </Text>
                <Text className='m-0 text-[14px] text-gray-600'>
                  <strong>Your email:</strong> {props.email}
                </Text>
              </Section>

              {/* Footer */}
              <Section className='mt-8 border-t border-gray-200 pt-6'>
                <Text className='m-0 mb-2 text-center text-[12px] text-gray-500'>
                  This invitation was sent to {props.email}. If you weren&apos;t
                  expecting this invitation, you can safely ignore this email.
                </Text>
                <Text className='m-0 text-center text-[12px] leading-4 text-gray-400'>
                  {APP_NAME}
                  <br />
                  {APP_ADDRESS1}
                  <br />
                  {APP_ADDRESS2}
                </Text>

                <Text className='m-0 mt-2 text-center text-[12px] leading-4 text-gray-400'>
                  | © {new Date().getFullYear()} {APP_NAME}. All rights
                  reserved.
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default sendOrganizationInviteEmail
