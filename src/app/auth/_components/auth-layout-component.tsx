'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import Image from 'next/image'

import { useState } from 'react'
import LoginForm from './login-form'
import RegisterForm from './register-form'

export interface AuthLayoutComponentProps {
  redirectTo?: string
}

function AuthLayoutComponent({ redirectTo }: AuthLayoutComponentProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  return (
    <div className='flex items-center justify-center'>
      <div className='bg-card w-full max-w-4xl min-w-[825px] rounded-lg border p-5 shadow-sm'>
        <div className='grid grid-cols-1 lg:grid-cols-2'>
          {/* Left side - Branding & Features */}
          <div className='bg-gradient-hero relative hidden flex-col justify-center overflow-hidden p-8 lg:flex'>
            <div className='space-y-6'>
              <div className='animate-fade-in flex items-center gap-2'>
                <Image src='/images/logo.svg' alt='' width={48} height={48} />
              </div>
              <div className='-mt[70px] space-y-4'>
                <h2 className='text-3xl leading-tight font-bold'>
                  Automate <br />
                  <span className='text-primary'>Work Smarter</span>
                </h2>
                <p className='text-muted-foreground text-lg'>
                  Accountants building workflow automations.
                </p>
              </div>
            </div>
          </div>
          {/* <h1 className="text-2xl font-bold text-center mb-6">Welcome!</h1> */}
          {/* Right side form */}
          <div className='w-full'>
            <Tabs
              value={activeTab}
              onValueChange={value =>
                setActiveTab(value as 'login' | 'register')
              }
              className='w-full'
            >
              <TabsList className='border-accent mb-4 grid w-full grid-cols-2 border dark:bg-blue-600'>
                <TabsTrigger
                  className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                  value='login'
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  className='data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
                  value='register'
                >
                  Register
                </TabsTrigger>
              </TabsList>
              <TabsContent value='login' className=''>
                <LoginForm redirectTo={redirectTo} />
              </TabsContent>
              <TabsContent value='register'>
                <RegisterForm redirectTo={redirectTo} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayoutComponent
