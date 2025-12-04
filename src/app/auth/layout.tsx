import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

export default async function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-svh flex-col items-center bg-gray-300 p-6 md:p-10'>
      <div className='mt-48 w-full max-w-xs md:max-w-[850px]'>
        <Link
          href='/'
          className='mt-12 mb-6 inline-flex items-center justify-start'
        >
          <ArrowLeftIcon
            suppressHydrationWarning
            className='text-primary mr-2 size-4'
          />
          <span className='text-primary font-bold'>Back to Home Page</span>
        </Link>
        {children}
      </div>
    </div>
  )
}
