// src/lib/get-client-user.ts
'use client'

import { useState, useEffect } from 'react'

import { getUISession, UISession } from './get-ui-session'

export type ClientUser = UISession['user']
export type ClientUI = UISession['ui']

export function useClientUser() {
  const [user, setUser] = useState<ClientUser | null>(null)
  const [ui, setUI] = useState<ClientUI | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchUser() {
      setLoading(true)
      try {
        // ✅ Use the server-side safe getUISession API
        const session: UISession = await getUISession()
        if (!isMounted) return

        setUser(session.user)
        setUI(session.ui)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to fetch client user:', err)
        setError((err as Error).message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchUser()

    return () => {
      isMounted = false
    }
  }, [])

  return { user, ui, loading, error }
}
