// app/(site)/layout.tsx

import { getUISession } from '@/lib/get-ui-session'

import { Navbar } from '@/components/site-home/navbar'

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { session, ui } = await getUISession()

  return (
    <div>
      {/* Navbar with server-side session + UI flags */}
      <Navbar serverSession={session} ui={ui} />

      {children}
    </div>
  )
}
