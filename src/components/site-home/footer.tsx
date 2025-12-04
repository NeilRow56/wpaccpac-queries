import { Book, Shield, UserCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'

export function Footer() {
  return (
    <footer className='border-primary/10 border-t bg-gray-200 px-6 py-16 dark:bg-zinc-950'>
      <div className='container mx-auto max-w-7xl'>
        <div className='mb-12 grid grid-cols-1 gap-8 md:grid-cols-4'>
          <div className='animate-fade-in'>
            <div className='mb-4 flex items-center gap-2'>
              <Link href='/'>
                <div className='animate-fade-in flex items-center gap-2'>
                  <Image src='/images/logo.svg' alt='' width={48} height={48} />
                </div>
              </Link>
            </div>
            <p className='text-muted-foreground leading relaxed mt-[50px] mb-6 text-sm'>
              The next-generation of accountants workflow automation. Create
              online working papers effortlessly.
            </p>
          </div>
          {/* Resources */}
          <div className='animate-fade-in' style={{ animationDelay: '0.15s' }}>
            <h4 className='font-semibold'>Resources</h4>
            <div className='flex flex-col space-y-3'>
              <a
                href='#'
                className='text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm transition-colors'
              >
                <Book className='h-3 w-3' />
                Features
              </a>
              <a
                href='#workflows'
                className='text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm transition-colors'
              >
                <Book className='h-3 w-3' />
                Workflows
              </a>
            </div>
          </div>
          {/* Product */}
          <div className='animate-fade-in' style={{ animationDelay: '0.15s' }}>
            <h4 className='font-semibold'>Product</h4>
            <div className='space-y-3'>
              <a
                href='#'
                className='text-muted-foreground hover:text-primary block text-sm transition-colors'
              >
                Features
              </a>
              <a
                href='#workflows'
                className='text-muted-foreground hover:text-primary block text-sm transition-colors'
              >
                Workflows
              </a>

              <a
                href='#pricing'
                className='text-muted-foreground hover:text-primary block text-sm transition-colors'
              >
                Pricing
              </a>
            </div>
          </div>
          {/* Legals */}
          <div className='animate-fade-in' style={{ animationDelay: '0.15s' }}>
            <h4 className='font-semibold'>Legal</h4>
            <div className='flex flex-col space-y-3'>
              <a
                href='#'
                className='text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm transition-colors'
              >
                <Shield className='h-3 w-3' />
                Privacy Policy
              </a>
              <a
                href='#'
                className='text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm transition-colors'
              >
                <UserCheck className='h-3 w-3' />
                Terms of Service
              </a>
              <a
                href='#'
                className='text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm transition-colors'
              >
                Security
              </a>
              <a
                href='#'
                className='text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm transition-colors'
              >
                GDPR
              </a>
            </div>
          </div>
        </div>
        {/* Bottom Bar */}
        <div className='border-primary/10 border-t pt-8'>
          <div className='flex flex-col items-center justify-between gap-4 md:flex-row'>
            <div className='text-muted-foreground text-sm'>
              &copy;{' '}
              <Suspense>
                <DynamicFooterDate />
              </Suspense>{' '}
              WpAccPac. All rights reserved
            </div>
            <div className='text-muted-foreground flex items-center gap-6 text-sm'>
              <span>Made with ❤️ for accountants</span>
              <div className='flex items-center gap-2'>
                <div className='bg-primary ainimate-glow-pulse h-2 w-2 rounded-full'></div>
                <span>SystemStaus: Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

async function DynamicFooterDate() {
  await connection()
  const currentYear = new Date().getFullYear()

  return currentYear
}
