import type { NavSection } from './types'

export function getClientNav(clientId: string): NavSection[] {
  const base = `/organisation/clients/${clientId}`

  return [
    {
      label: 'Current Client',
      href: base,
      items: [{ label: 'Overview', href: base }]
    },
    {
      label: 'Accounting Periods',
      href: `${base}/accounting-periods`,
      items: [
        {
          label: 'Periods',
          href: `${base}/accounting-periods`
        }
      ]
    }
  ]
}
