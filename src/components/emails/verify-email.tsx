import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Tailwind
} from '@react-email/components'
import { APP_ADDRESS1, APP_ADDRESS2, APP_NAME } from '@/lib/constants'

interface VerifyEmailProps {
  username: string
  verifyUrl: string
}

const VerifyEmail = (props: VerifyEmailProps) => {
  const { username, verifyUrl } = props
  return (
    <Html lang='en' dir='ltr'>
      <Tailwind>
        <Head />
        <Body className='bg-gray-100 py-10 font-sans'>
          <Container className='mx-auto max-w-[600px] rounded-xl bg-white p-8'>
            <Section>
              <Text className='mt-0 mb-4 text-[24px] font-bold text-gray-900'>
                Verify your email address
              </Text>

              <Text className='mt-0 mb-6 text-[16px] leading-6 text-gray-700'>
                Thanks {username} for signing up! To complete your registration
                and secure your account, please verify your email address by
                clicking the button below.
              </Text>

              <Section className='mb-8 text-center'>
                <Button
                  href={verifyUrl}
                  className='box-border rounded-[6px] bg-blue-600 px-8 py-3 text-[16px] font-medium text-white no-underline'
                >
                  Verify Email Address
                </Button>
              </Section>

              <Text className='mt-0 mb-6 text-[14px] leading-5 text-gray-600'>
                If the button doesn&apos;t work, you can copy and paste this
                link into your browser:
                <br />
                {verifyUrl}
              </Text>

              <Text className='mt-0 mb-8 text-[14px] leading-5 text-gray-600'>
                This verification link will expire in 24 hours. If you
                didn&apos;t create an account, you can safely ignore this email.
              </Text>

              <Hr className='my-6 border-gray-200' />

              <Text className='m-0 text-[12px] leading-4 text-gray-500'>
                Best regards,
                <br />
                The Team
              </Text>
            </Section>

            <Section className='mt-8 border-t border-gray-200 pt-6'>
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

export default VerifyEmail
