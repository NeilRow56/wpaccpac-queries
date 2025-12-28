import type { NavSection } from './types'

export function getClientNav(clientId: string): NavSection[] {
  const base = `/organisation/clients/${clientId}`

  return [
    {
      title: 'Current Client',
      href: base,
      items: [{ title: 'Overview', href: base }]
    },
    {
      title: 'Accounting Periods',
      href: `${base}/accounting-periods`,
      items: [
        {
          title: 'Periods',
          href: `${base}/accounting-periods`
        }
      ]
    }
  ]
}
