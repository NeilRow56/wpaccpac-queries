'use client'

import React, { Suspense } from 'react'
import { SkeletonArray } from '@/components/shared/skeleton'
import { SkeletonCustomerCard } from '@/components/shared/skeleton-customer-card'

type SuspenseWrapperProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

/**
 * A reusable wrapper for Suspense boundaries that ensures
 * a stable container and prevents negative timestamp warnings.
 */
const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  children,
  fallback,
  className = ''
}) => {
  return (
    <div className={className}>
      <Suspense
        fallback={
          fallback ?? (
            <SkeletonArray amount={3}>
              <SkeletonCustomerCard />
            </SkeletonArray>
          )
        }
      >
        {children}
      </Suspense>
    </div>
  )
}

export default SuspenseWrapper
