import SuspenseWrapper from '@/components/shared/suspense-wrapper'
import { getUISession } from '@/lib/get-ui-session'
import { redirect } from 'next/navigation'
import AuthLayoutComponent from './_components/auth-layout-component'

interface AuthPageProps {
  searchParams?: {
    redirect?: string
  }
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { user } = await getUISession()
  // 1️⃣ If already logged in → never show auth UI
  if (user) {
    redirect('/dashboard')
  }

  // 2️⃣ Validate redirect param (see next section)
  const redirectTo = validateRedirect(searchParams?.redirect)
  return (
    <div>
      <SuspenseWrapper>
        <AuthLayoutComponent redirectTo={redirectTo} />
      </SuspenseWrapper>
    </div>
  )
}

/**
 * Prevent open redirects (VERY important)
 */
function validateRedirect(redirect?: string): string | undefined {
  if (!redirect) return undefined

  // Only allow internal paths
  if (!redirect.startsWith('/')) return undefined
  if (redirect.startsWith('//')) return undefined
  if (redirect.includes('://')) return undefined

  return redirect
}
