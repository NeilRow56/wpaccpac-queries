import { Navbar } from '@/components/site-home/navbar'

export default async function PublicFolderLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className=''>
      <Navbar />
      <main className=''>{children}</main>
    </div>
  )
}
