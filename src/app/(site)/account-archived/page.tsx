import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export default function UserArchivedPage() {
  return (
    <div className='container mx-auto max-w-6xl py-10'>
      <Link href='/dashboard' className='mb-6 inline-flex items-center'>
        <ArrowLeft className='mr-2 size-4' />
        <span className='text-primary'>Back to Dashboard</span>
      </Link>

      <div className='mt-12 mb-2 space-y-2'>
        <h2 className='text-3xl font-bold text-red-600'>
          This person has been archived.
        </h2>
        <h3 className='text-primary/90'>Select active organization</h3>
      </div>
    </div>
  )
}
