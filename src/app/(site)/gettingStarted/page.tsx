import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

export default function GettingStartedPage() {
  return (
    <div className='container mx-auto flex max-w-3xl flex-col px-3 py-10 text-wrap md:max-w-5xl'>
      <div className='mb-8 flex flex-col'>
        <h1 className='text-primary text-2xl font-bold'>
          Create working papers&apos; lead schedules, queries , and data
          analysis online.
        </h1>
        <h1 className='text-primary text-2xl font-bold'>
          Workprogramme templates tailored to the size of the client entity.
        </h1>
      </div>

      <p className='text-muted-foreground'>
        {' '}
        (Please follow the steps in order)
      </p>

      <div className='space-y-4'>
        <div className='items-centre flex gap-4'>
          <p className='pt-1'>
            1. Register your administrator with wpaccpac - using{' '}
          </p>
          <Button
            className='text-primary-foreground bg-green-500'
            asChild
            variant='hero'
            size='sm'
          >
            <Link href='/auth'>Get Started For Free</Link>
          </Button>
        </div>
        <p className='pt-1'>
          2. Administrator checks emails and verifies their email addrress.{' '}
        </p>

        <p className='pt-1'>
          3. Once verified wpaccpac will open in a new window. You can close the
          old tab. You are now logged in and ready to go.
        </p>
        <p>
          <span className='pl-4 text-blue-600'>
            If you need to edit the name you used to register, select settings
            from the sidebar and update as required.
          </span>
        </p>
        <p className='flex flex-col pt-1'>
          4. Only admin users can perform certain actions. It is very important
          that your first organization (see below) is set up by the
          administrator.
          <span className='pl-4'>
            The administrator will have full admin. permissions. All subsequent
            users for that organization will initially not have administator
            access, unless their status is changed by the administrator.
          </span>
        </p>

        <p className='pt-1'>
          5. The next stage is for the{' '}
          <span className='pl-1 text-blue-600'>administrator </span>
          to create an organization.
        </p>
        <p className='text-blue-600'>
          <span className='pl-4 text-blue-600'>
            The organization link will appear in the top navigation bar once the
            administrator&apos;s email verification is complete.
          </span>
        </p>
        <p className='pt-1'>
          6. The <span className='pl-1 text-blue-600'>administrator</span> can
          now send out invitations to other team members to join the
          organization and register with wpaccpac.
        </p>

        <p className='flex pt-1'>
          7. Cost centers should now be set up by the{' '}
          <span className='pl-1 text-blue-600'>administrator </span>.
        </p>
        <p></p>
        <span className='pl-4'>
          Cost center names are usually the individual members of your team with
          ultimate responsibilty for a particular portfolio of clients.
        </span>

        <p>
          <span className='pl-4 text-blue-600'>
            You are now ready to create your first client.
          </span>
        </p>
        <p className='pt-1'>
          8. Click the dropdown menu with the avatar in the top navigation bar
          and select clients.
        </p>
        <div className='flex pl-4'>
          <span>
            <h3> Any problems please contact </h3>
          </span>
          <span className='pl-1 text-blue-600'>admin@wpaccpac.org </span>
        </div>
      </div>
    </div>
  )
}
