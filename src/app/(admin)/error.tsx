'use client' // Error components must be Client Components

import { Button } from '@/components/ui/button'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className='space-y-2'>
      <h2 className='pl-5 text-2xl text-red-500'>Something went wrong!</h2>
      <h2 className='pl-5 text-2xl text-red-500'>{error.message}</h2>
      <Button
        className='mt-4 ml-5 bg-red-500'
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </Button>
    </div>
  )
}
