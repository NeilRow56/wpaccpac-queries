'use client'

import { Button } from '@/components/ui/button'

import Image from 'next/image'
import Link from 'next/link'

import { APP_NAME } from '@/lib/constants'

import { ModeToggle } from '../mode-toggle'
import { BookOpen, CreditCard, Zap } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

import { UserDropdown } from './user-dropdown'
import { useEffect, useState } from 'react'

const navItems = [
  { name: 'Features', href: '#features', icon: Zap },
  { name: 'Workflows', href: '#workflows', icon: BookOpen },
  { name: 'Pricing', href: '#pricing', icon: CreditCard }
]

export function Navbar() {
  const [, setHasAdminPermission] = useState(false)
  const { data: session, isPending: loading } = authClient.useSession()
  const user = session?.user

  useEffect(() => {
    authClient.admin
      .hasPermission({ permission: { project: ['update'] } })
      .then(({ data }) => {
        setHasAdminPermission(data?.success ?? false)
      })
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <header className='bg-background/95 backdrop-blur-[backdrop-filter]:bg-background sticky top-0 z-50 w-full border-b'>
      <div className='mx-auto flex min-h-16 max-w-[2040px] items-center px-4 md:px-6 lg:px-8'>
        <Link href='/' className='mr-4 flex items-center space-x-2'>
          <Image
            src={'/images/logo.svg'}
            alt='logo'
            width={32}
            height={32}
            className='size-9'
          />
          <span className='font-bold'>{APP_NAME}</span>
        </Link>
        {/* Desktop navigation */}
        <nav className='hidden md:flex md:flex-1 md:items-center md:justify-between'>
          <div className='flex items-center gap-2'></div>
          <div className='flex items-center gap-2'>
            {navItems.map(item => (
              <Link
                className='hover:text-primary text-sm font-medium text-blue-600 transition-colors'
                href={item.href}
                key={item.href}
              >
                <item.icon className='h-4 w-4' />
                {item.name}
              </Link>
            ))}
          </div>
          <div className='flex items-center space-x-4'>
            <>
              <Button variant='outline' asChild size='lg'>
                <Link href='/organization'>Organization</Link>
              </Button>
            </>

            {session?.user.isSuperUser === true ? (
              <>
                <Button variant='outline' asChild size='lg'>
                  <Link href='/admin'>Admin</Link>
                </Button>
                <Button variant='outline' asChild size='lg'>
                  <Link href='/protected'>Protected</Link>
                </Button>
              </>
            ) : (
              ''
            )}
            <Button variant='outline' asChild size='lg'>
              <Link href='/settings'>Settings</Link>
            </Button>
            <ModeToggle />
            {user ? (
              <div className='flex items-center gap-3'>
                <UserDropdown
                  name={session.user.name}
                  email={session.user.email}
                  image={session.user.image || ''}
                />
              </div>
            ) : (
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
      </div>
    </header>
  )
}
