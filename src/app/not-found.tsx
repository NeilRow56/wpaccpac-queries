import Image from 'next/image'

export const metadata = {
  title: 'Page Not Found'
}

export default function NotFound() {
  return (
    <div className='w-full px-2'>
      <div className='mx-auto flex h-screen flex-col items-center justify-center gap-4 py-4'>
        <Image
          className='m-0 rounded-xl'
          src='/images/not-found-1024x1024.png'
          width={300}
          height={300}
          sizes='300px'
          alt='Page Not Found'
          priority={true}
          title='Page Not Found'
        />
        <h2 className='pt-16 text-2xl text-red-600'>Page Not Found</h2>
      </div>
    </div>
  )
}
