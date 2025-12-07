// app/(site)/layout.tsx
import { Navbar } from '@/components/site-home/navbar'
import { getSessionServer } from '@/lib/session'

export default async function Layout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getSessionServer() // server-side session

  return (
    <div>
      <Navbar serverSession={session} />
      {children}
    </div>
  )
}
