import { ClientNavMain } from './client-nav-main'

interface ClientSidebarContentProps {
  clientId: string
}

export function ClientSidebarContent({ clientId }: ClientSidebarContentProps) {
  const data = {
    navMain: [
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
        title: 'Accounting Periods Summaary',
        url: `/organisation/clients/${clientId}/accounting-periods`,
        items: [
          {
            title: 'Periods ',
            url: `/organisation/clients/${clientId}/accounting-periods`
          }
        ]
      }
    ]
  }

  return <ClientNavMain items={data.navMain} />
}
