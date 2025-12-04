import { cn } from '@/lib/utils'

import { ReactNode } from 'react'
import { buttonVariants } from '../ui/button'

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        buttonVariants({
          variant: 'secondary',
          className: 'pointer-events-none w-24 animate-pulse'
        }),
        className
      )}
    />
  )
}

export function SkeletonArray({
  amount,
  children
}: {
  amount: number
  children: ReactNode
}) {
  return Array.from({ length: amount }).map(() => children)
}

export function SkeletonText({
  rows = 1,
  size = 'md',
  className
}: {
  rows?: number
  size?: 'md' | 'lg'
  className?: string
}) {
  return (
    <div className='flex flex-col gap-1'>
      <SkeletonArray amount={rows}>
        <div
          className={cn(
            'bg-secondary w-full animate-pulse rounded-sm',
            rows > 1 && 'last:w-3/4',
            size === 'md' && 'h-3',
            size === 'lg' && 'h-5',
            className
          )}
        />
      </SkeletonArray>
    </div>
  )
}
