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
  Text,
  Tailwind
} from '@react-email/components'
import { APP_ADDRESS1, APP_ADDRESS2, APP_NAME } from '@/lib/constants'

interface ForgotPasswordEmailProps {
  username: string
  resetUrl: string
  userEmail: string
}

const ForgotPasswordEmail = (props: ForgotPasswordEmailProps) => {
  const { username, resetUrl, userEmail } = props

  return (
    <Html lang='en' dir='ltr'>
      <Tailwind>
        <Head />
        <Preview>Reset your password - Action required</Preview>
        <Body className='bg-gray-100 py-10 font-sans'>
          <Container className='rounded-2 mx-auto max-w-[600px] bg-white p-10 shadow-sm'>
            {/* Header */}
            <Section className='mb-8 text-center'>
              <Heading className='m-0 mb-2 text-[28px] font-bold text-gray-900'>
                Reset Your Password
              </Heading>
              <Text className='m-0 text-[16px] text-gray-600'>
                We received a request to reset your password
              </Text>
            </Section>

            {/* Main Content */}
            <Section className='mb-8'>
              <Text className='m-0 mb-4 text-[16px] leading-6 text-gray-700'>
                Hello, {username}
              </Text>
              <Text className='m-0 mb-4 text-[16px] leading-6 text-gray-700'>
                We received a password reset request for your account associated
                with <strong>{userEmail}</strong>.
              </Text>
              <Text className='m-0 mb-6 text-[16px] leading-6 text-gray-700'>
                Click the button below to create a new password. This link will
                expire in 24 hours for security reasons.
              </Text>
            </Section>

            {/* Reset Button */}
            <Section className='mb-8 text-center'>
              <Button
                href={resetUrl}
                className='rounded-2 box-border inline-block bg-blue-600 px-8 py-4 text-[16px] font-semibold text-white no-underline'
              >
                Reset Password
              </Button>
            </Section>

            {/* Alternative Link */}
            <Section className='mb-8'>
              <Text className='m-0 mb-2 text-[14px] leading-5 text-gray-600'>
                If the button doesn&apos;t work, copy and paste this link into
                your browser:
              </Text>
              <Link
                href={resetUrl}
                className='text-[14px] break-all text-blue-600'
              >
                {resetUrl}
              </Link>
            </Section>

            {/* Security Notice */}
            <Section className='rounded-2 mb-8 bg-gray-50 p-5'>
              <Text className='m-0 mb-2 text-[14px] leading-5 font-semibold text-gray-700'>
                Security Notice:
              </Text>
              <Text className='m-0 mb-2 text-[14px] leading-5 text-gray-600'>
                • If you didn&apos;t request this password reset, please ignore
                this email
              </Text>
              <Text className='m-0 mb-2 text-[14px] leading-5 text-gray-600'>
                • This link will expire in 24 hours
              </Text>
              <Text className='m-0 text-[14px] leading-5 text-gray-600'>
                • For security, never share this link with anyone
              </Text>
            </Section>

            {/* Help Section */}
            <Section className='mb-8'>
              <Text className='m-0 text-[14px] leading-5 text-gray-600'>
                Need help? Contact our support team at{' '}
                <Link
                  href='mailto:admin@wpaccpac.org'
                  className='text-blue-600'
                >
                  admin@wpaccpac.org
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className='border-t border-gray-200 pt-6'>
              <Text className='m-0 mb-2 text-[12px] leading-4 text-gray-500'>
                This email was sent to {userEmail}
              </Text>
              <Text className='m-0 text-center text-[12px] leading-4 text-gray-400'>
                {APP_NAME}
                <br />
                {APP_ADDRESS1}
                <br />
                {APP_ADDRESS2}
              </Text>
              <Text className='m-0 mt-2 text-center text-[12px] leading-4 text-gray-400'>
                | © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default ForgotPasswordEmail
