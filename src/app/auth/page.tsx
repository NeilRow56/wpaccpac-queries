import React from 'react'
import AuthLayoutComponent from './_components/auth-layout-component'
import SuspenseWrapper from '@/components/shared/suspense-wrapper'

export default function AuthPage() {
  return (
    <div>
      <SuspenseWrapper>
        <AuthLayoutComponent />
      </SuspenseWrapper>
    </div>
  )
}
