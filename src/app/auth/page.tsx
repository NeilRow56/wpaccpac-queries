import SuspenseWrapper from '@/components/shared/suspense-wrapper'

import AuthLayoutComponent from './_components/auth-layout-component'

interface AuthPageProps {
  searchParams?: Promise<{
    redirect?: string
  }>
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const resolvedSearchParams = await searchParams
  const redirectTo = validateRedirect(resolvedSearchParams?.redirect)

  return (
    <SuspenseWrapper>
      <AuthLayoutComponent redirectTo={redirectTo} />
    </SuspenseWrapper>
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
