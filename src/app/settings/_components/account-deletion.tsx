'use client'

import { BetterAuthActionButton } from '@/components/shared/better-auth-action-button'
import { authClient } from '@/lib/auth-client'

export function AccountDeletion() {
  return (
    <BetterAuthActionButton
      requireAreYouSure
      variant='destructive'
      className='w-full'
      successMessage='Account deletion initiated. '
      action={() => authClient.deleteUser({ callbackURL: '/' })}
    >
      Delete Account Permanently
    </BetterAuthActionButton>
  )
}
