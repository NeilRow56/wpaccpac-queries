'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ModeToggle } from '../mode-toggle'
import { BookOpen, CreditCard, Zap, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { UserDropdown } from './user-dropdown'
import { Session } from '@/lib/auth'

const navItems = [
  { name: 'Features', href: '#features', icon: Zap },
  { name: 'Workflows', href: '#workflows', icon: BookOpen },
  { name: 'Pricing', href: '#pricing', icon: CreditCard }
]

interface NavbarProps {
  serverSession: Session | null
  ui?: {
    canCreateOrganization: boolean
    canAccessAdmin: boolean
  }
}

export function Navbar({ serverSession, ui }: NavbarProps) {
  const { data: clientSession, isPending } = authClient.useSession()
  const session = clientSession ?? serverSession

  const [mobileOpen, setMobileOpen] = useState(false)

  const RightSkeleton = (
    <div className='flex animate-pulse items-center gap-3'>
      <div className='bg-muted h-9 w-20 rounded-md' />
      <div className='bg-muted h-9 w-9 rounded-full' />
    </div>
  )

  return (
    <header className='bg-background/95 sticky top-0 z-50 w-full border-b backdrop-blur'>
      <div className='mx-auto flex min-h-16 max-w-[2040px] items-center justify-between px-4 md:px-6 lg:px-8'>
        {/* Logo */}
        <Link href='/' className='flex items-center space-x-2'>
          <Image
            src='/images/logo.svg'
            alt='logo'
            width={32}
            height={32}
            className='size-9'
          />
        </Link>

        {/* Desktop nav */}
        <nav className='hidden lg:flex lg:flex-1 lg:items-center lg:justify-between'>
          <div className='ml-12 flex items-center gap-4'>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className='hover:text-primary flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors'
              >
                <item.icon className='h-4 w-4' />
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className='flex items-center gap-4'>
            {isPending && RightSkeleton}

            {!isPending && session && (
              <>
                {/* {ui?.canCreateOrganization && (
                  <Button variant='outline' asChild size='lg'>
                    <Link href='/organization'>Organization</Link>
                  </Button>
                )} */}

                <Button variant='outline' asChild size='lg'>
                  <Link href='/organization'>Organisation</Link>
                </Button>

                {ui?.canAccessAdmin && (
                  <>
                    <Button variant='outline' asChild size='lg'>
                      <Link href='/admin'>Admin</Link>
                    </Button>
                  </>
                )}

                <Button variant='outline' asChild size='lg'>
                  <Link href='/settings'>Settings</Link>
                </Button>

                <UserDropdown
                  name={session.user.name}
                  email={session.user.email}
                  image={session.user.image || ''}
                />
                <ModeToggle />
              </>
            )}

            {!isPending && !session && (
              <Button
                className='text-primary-foreground bg-green-500'
                asChild
                variant='hero'
                size='sm'
              >
                <Link href='/auth'>Get Started For Free</Link>
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile menu button */}
        <div className='flex lg:hidden'>
          <Button
            variant='ghost'
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label='Toggle menu'
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className='border-muted/50 bg-background border-t p-4 md:hidden'>
          <div className='flex flex-col gap-2'>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className='flex items-center gap-2 text-sm font-medium text-blue-600'
              >
                <item.icon className='h-4 w-4' />
                {item.name}
              </Link>
            ))}

            {!isPending && session && (
              <div className='mt-2 flex flex-col gap-2'>
                {ui?.canCreateOrganization && (
                  <Button variant='outline' asChild size='lg'>
                    <Link href='/organization'>Organization</Link>
                  </Button>
                )}

                {ui?.canAccessAdmin && (
                  <>
                    <Button variant='outline' asChild size='lg'>
                      <Link href='/admin'>Admin</Link>
                    </Button>
                  </>
                )}

                <Button variant='outline' asChild size='lg'>
                  <Link href='/settings'>Settings</Link>
                </Button>

                <UserDropdown
                  name={session.user.name}
                  email={session.user.email}
                  image={session.user.image || ''}
                />
              </div>
            )}

            {!isPending && !session && (
              <Button
                className='text-primary-foreground bg-green-500'
                asChild
                variant='hero'
                size='sm'
              >
                <Link href='/auth'>Get Started For Free</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
