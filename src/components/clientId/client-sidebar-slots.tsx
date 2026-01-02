import { ClientNavMain } from './client-nav-main'

export interface ClientNavItem {
  title: string
  url: string
  items?: {
    title: string
    url: string
  }[]
}

export function getClientNav(clientId: string): ClientNavItem[] {
  return [
    {
      title: 'Current client',
      url: `/organisation/clients/${clientId}`,
      items: [
        {
          title: 'Overview',
          url: `/organisation/clients/${clientId}`
        }
      ]
    },
    {
      title: 'Accounting Periods Summary',
      url: `/organisation/clients/${clientId}/accounting-periods`,
      items: [
        {
          title: 'Periods',
          url: `/organisation/clients/${clientId}/accounting-periods`
        }
      ]
    },
    {
      title: 'Fixed Assets Summary',
      url: `/organisation/clients/${clientId}/fixed-assets`,
      items: [
        {
          title: 'Fixed Assets',
          url: `/organisation/clients/${clientId}/fixed-assets`
        }
      ]
    }
  ]
}

export function ClientSidebarContent({ clientId }: { clientId: string }) {
  const nav = getClientNav(clientId)
  return <ClientNavMain items={nav} />
}
