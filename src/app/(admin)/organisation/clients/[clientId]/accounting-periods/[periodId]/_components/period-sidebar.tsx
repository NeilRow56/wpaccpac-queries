'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  FileText,
  Layers,
  BarChart,
  PoundSterling,
  ScanBarcode,
  CreativeCommons,
  User2Icon,
  ScaleIcon,
  CreditCardIcon,
  DockIcon
} from 'lucide-react'
import type { PeriodStatus } from '@/db/schema'

type Section = {
  key: string
  label: string
  href: string
  icon: React.ReactNode
  enabled?: boolean
}

export default function PeriodSidebar(props: {
  clientId: string
  periodId: string
  periodName: string
  startDate: string
  endDate: string
  status: PeriodStatus
}) {
  //   const { clientId, periodId, periodName, startDate, endDate, status } = props
  const { clientId, periodId, status } = props

  const sections: Section[] = [
    {
      key: 'accounts',
      label: 'Accounts and Completion',
      href: 'accounts',
      icon: <FileText className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'planning',
      label: 'Planning',
      href: 'planning',
      icon: <FileText className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'taxation',
      label: 'Taxation',
      href: 'taxation',
      icon: <FileText className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'related-parties',
      label: 'Related Parties ',
      href: 'related-parties',
      icon: <FileText className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'assets',
      label: 'Fixed Assets',
      href: 'assets',
      icon: <Layers className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'stocks',
      label: 'Stocks',
      href: 'stocks',
      icon: <Layers className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'sales-debtors',
      label: 'Sales and Debtors',
      href: 'sales-debtors',
      icon: <BarChart className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'cash-bank',
      label: 'Cash at Bank and in hand',
      href: 'cash-bank',
      icon: <PoundSterling className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'purchases-creditors',
      label: 'Purchases and Creditors',
      href: 'purchases-creditors',
      icon: <ScanBarcode className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'provisions-liabilities-charges',
      label: 'Provision for Liabilities and Charges',
      href: 'provision-liabilities-charges',
      icon: <CreativeCommons className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'share-capital',
      label: 'Share Capital',
      href: 'share-capital',
      icon: <PoundSterling className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'wages-salaries',
      label: 'Wages and Salaries',
      href: 'wages-salaries',
      icon: <User2Icon className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'trial-balance-journals',
      label: 'Trial balance, Journals',
      href: 'trial-balance-journals',
      icon: <ScaleIcon className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'vat',
      label: 'VAT',
      href: 'vat',
      icon: <CreditCardIcon className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'sundry',
      label: 'Sundry Workings',
      href: 'sundry',
      icon: <DockIcon className='h-4 w-4' />,
      enabled: true
    }
  ]

  return (
    <aside className='mr-12 w-80 shrink-0 space-y-4'>
      <div className='rounded-md border p-3'>
        {/* <div className='text-sm font-medium'>{periodName}</div> */}
        {/* <div className='text-muted-foreground text-xs'>
          {startDate} → {endDate}
        </div> */}
        <div className='mt-1 text-xs'>
          Status:{' '}
          <span
            className={
              status === 'OPEN' ? 'text-green-700' : 'text-muted-foreground'
            }
          >
            {status}
          </span>
        </div>
      </div>

      <nav className='space-y-1'>
        {sections.map(section => {
          const href = `/organisation/clients/${clientId}/accounting-periods/${periodId}/${section.href}`

          if (!section.enabled) {
            return (
              <div
                key={section.key}
                className='text-muted-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm'
              >
                {section.icon}
                {section.label}
                <span className='ml-auto text-xs'>(???)</span>
              </div>
            )
          }

          return (
            <Link
              key={section.key}
              href={href}
              className={cn(
                'hover:bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm'
              )}
            >
              {section.icon}
              {section.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
