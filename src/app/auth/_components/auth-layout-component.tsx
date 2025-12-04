'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'

function AuthLayoutComponent() {
  const [activeTab, setActiveTab] = useState('login')
  const router = useRouter()

  useEffect(() => {
    authClient.getSession().then(session => {
      if (session.data !== null) router.push('/dashboard')
    })
  }, [router])

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
              onValueChange={setActiveTab}
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
                <LoginForm />
              </TabsContent>
              <TabsContent value='register'>
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayoutComponent
