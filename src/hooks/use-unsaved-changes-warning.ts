'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

type Options = {
  message?: string
}

/**
 * Warn user before losing unsaved changes:
 * - refresh / close tab
 * - client-side navigation via link click (capture phase)
 *
 * Notes:
 * - Browsers restrict customizing beforeunload text; we still set returnValue.
 * - Back/forward is tricky; this covers most real-world cases reliably.
 */
export function useUnsavedChangesWarning(isDirty: boolean, options?: Options) {
  const message =
    options?.message ?? 'You have unsaved changes. Leave without saving?'
  const pathname = usePathname()

  // Keep latest values without re-binding listeners constantly
  const dirtyRef = React.useRef(isDirty)
  const messageRef = React.useRef(message)

  React.useEffect(() => {
    dirtyRef.current = isDirty
  }, [isDirty])

  React.useEffect(() => {
    messageRef.current = message
  }, [message])

  // 1) Refresh / close tab
  React.useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return
      e.preventDefault()
      // Required for Chrome
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // 2) Client-side navigation via clicking links
  React.useEffect(() => {
    function onDocumentClick(e: MouseEvent) {
      if (!dirtyRef.current) return
      if (e.defaultPrevented) return
      if (e.button !== 0) return // left click only
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return // new tab etc.

      // Find nearest anchor
      const target = e.target as HTMLElement | null
      const a = target?.closest?.('a') as HTMLAnchorElement | null
      if (!a) return

      // Ignore same-page hash links and external links/new tabs
      const href = a.getAttribute('href') ?? ''
      if (!href) return
      if (href.startsWith('#')) return
      if (a.target === '_blank') return
      if (a.hasAttribute('download')) return
      if (a.getAttribute('rel')?.includes('noreferrer')) {
        // still might be internal, but usually external; ignore to avoid annoying prompts
        // if you want, remove this guard
      }

      // Ignore external links
      // If href is absolute, compare origin
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return
      } catch {
        // If URL parsing fails, don't block
        return
      }

      // If link points to current route, don't warn
      try {
        const url = new URL(href, window.location.href)
        if (url.pathname === pathname) return
      } catch {
        // ignore
      }

      const ok = window.confirm(messageRef.current)
      if (!ok) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    // capture phase so we intercept before Next Link handler
    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [pathname])
}
