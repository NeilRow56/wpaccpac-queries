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
import { usePathname } from 'next/navigation'

type Section = {
  key: string
  label: string
  href: string // relative, e.g. "planning"
  match: string // used for active detection
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

  const pathname = usePathname()

  const sections: Section[] = [
    {
      key: 'accounts',
      label: 'Accounts and Completion',
      href: 'accounts',
      match: '/accounts',
      icon: <FileText className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'planning',
      label: 'Planning',
      href: 'planning',
      match: '/planning',
      icon: <FileText className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'taxation',
      label: 'Taxation',
      href: 'taxation',
      match: '/taxation',
      icon: <FileText className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'related-parties',
      label: 'Related Parties ',
      href: 'related-parties',
      match: '/related-parties',
      icon: <FileText className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'assets',
      label: 'Fixed Assets',
      href: 'assets',
      match: '/assets',
      icon: <Layers className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'stocks',
      label: 'Stocks',
      href: 'stocks',
      match: '/stocks',
      icon: <Layers className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'sales-debtors',
      label: 'Sales and Debtors',
      href: 'sales-debtors',
      match: '/sales-debtors',
      icon: <BarChart className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'cash-bank',
      label: 'Cash at Bank and in hand',
      href: 'cash-bank',
      match: '/cash-bank',
      icon: <PoundSterling className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'purchases-creditors',
      label: 'Purchases and Creditors',
      href: 'purchases-creditors',
      match: '/purchases-creditors',
      icon: <ScanBarcode className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'provisions-liabilities-charges',
      label: 'Provisions for Liabilities and Charges',
      href: 'provisions',
      match: '/provisions',
      icon: <CreativeCommons className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'share-capital',
      label: 'Share Capital',
      href: 'share-capital',
      match: '/share-capital',
      icon: <PoundSterling className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'wages-salaries',
      label: 'Wages and Salaries',
      href: 'wages-salaries',
      match: '/wages-salaries',
      icon: <User2Icon className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'trial-balance-journals',
      label: 'Trial balance, Journals',
      href: 'trial-balance-journals',
      match: '/trial-balance-journals',
      icon: <ScaleIcon className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'vat',
      label: 'VAT',
      href: 'vat',
      match: '/vat',
      icon: <CreditCardIcon className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'sundry',
      label: 'Sundry Workings',
      href: 'sundry',
      match: '/sundry',
      icon: <DockIcon className='h-4 w-4' />,
      enabled: true
    }
  ]

  return (
    <aside className='mr-12 w-64 shrink-0 space-y-4'>
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
          const base = `/organisation/clients/${clientId}/accounting-periods/${periodId}`

          const href = `${base}/${section.href}` // ✅ navigation target
          const full = `${base}${section.match}` // ✅ active-match base

          const isActive = pathname === full || pathname.startsWith(`${full}/`)

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
              href={href} // ✅ now defined
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted'
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
