import Image from 'next/image'
import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogoLarge } from '../shared/logo-large'

export default function HeroSection() {
  return (
    <section
      id='features'
      className='w-full bg-gray-100 pt-[6vh] lg:h-full dark:bg-zinc-950'
    >
      <div className='mx-auto flex w-[90%] flex-col justify-center sm:w-[80%]'>
        <div className='mb-8 flex w-full justify-between'>
          <div></div>
          <div>
            <LogoLarge />
          </div>
          <div className='flex items-center'></div>
        </div>
        <div className='grid grid-cols-1 items-center gap-12 lg:grid-cols-2'>
          {/* Text Content */}
          <div>
            {/* Top Box */}
            <div className='flex w-fit items-center space-x-3 rounded-full bg-white px-2 py-1.5 shadow-md md:px-5 dark:bg-zinc-950'>
              <div className='rounded-full bg-green-500 px-3 py-1 text-white sm:text-xs md:px-5 md:text-base'>
                <Link href='/gettingStarted'>How files are setup</Link>
              </div>
              <p className='text-xs text-red-500 sm:text-sm'>
                {/* We have updated our terms and conditions policy */}
              </p>
            </div>
            {/* Heading */}
            <div className='mt-2 rounded-2xl bg-blue-500 p-6'>
              <h1 className='mt-6 mb-6 text-2xl font-bold text-white sm:text-4xl md:text-5xl md:leading-12 lg:leading-14'>
                Create, and store, schedules for working papers with ease.
              </h1>
            </div>

            {/* Description */}

            <ul className='text-muted-foreground mt-8 mb-20 max-w-xl list-disc space-y-4 pl-4 font-bold'>
              <li className=''>Online accounts preparation file.</li>
              <li>Automatic comparative schedules.</li>
              <li>Secure cloud storage.</li>
              <li>
                Images and pdf files available direct from working papers.
              </li>
            </ul>
            <div className='items-center justify-center'>
              <Button className='w-[150px] rounded-full bg-blue-700 hover:bg-blue-700/70'>
                <Link href='#pricing'>
                  <span className='dark:text-amber-400'>Pricing</span>
                </Link>
              </Button>
              <p className='mt-12 pb-8 text-xl text-yellow-600 sm:text-4xl'>
                Try for Free - full pricing schedule below
              </p>
            </div>
            <div className='mt-4 hidden 2xl:block'>
              <Image
                className='rounded-lg'
                src='/images/a.jpg'
                alt='Hero image'
                width={300}
                height={300}
              />
            </div>
          </div>

          {/* Image Content */}

          <div className='hidden w-full lg:block'>
            <Image
              src='/images/hero.png'
              alt='Hero image'
              width={1000}
              height={1000}
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
