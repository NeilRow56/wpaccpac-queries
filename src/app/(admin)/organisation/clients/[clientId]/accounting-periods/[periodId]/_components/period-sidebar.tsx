'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { PeriodStatus } from '@/db/schema'
import {
  FileText,
  BarChart,
  PoundSterling,
  ScanBarcode,
  CreativeCommons,
  User2Icon,
  ScaleIcon,
  CreditCardIcon,
  DockIcon,
  PackageOpen,
  Van,
  Landmark
} from 'lucide-react'

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
  planningCompletion: {
    completed: number
    total: number
  }
}) {
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
      icon: <Landmark className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'related-parties',
      label: 'Related Parties',
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
      icon: <Van className='h-4 w-4' />,
      enabled: true
    },
    {
      key: 'stocks',
      label: 'Stocks',
      href: 'stocks',
      match: '/stocks',
      icon: <PackageOpen className='h-4 w-4' />,
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
      key: 'cash-at-bank',
      label: 'Cash at Bank and in hand',
      href: 'cash-at-bank',
      match: '/cash-at-bank',
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
    // ✅ Collapses to icon-rail under xl, expands on xl+
    <aside className='sidebar:w-56 w-14 shrink-0 space-y-4 2xl:w-64'>
      {/* Status card: hidden when collapsed */}
      <div className='sidebar:block hidden rounded-md border px-3 py-2'>
        <div className='text-xs'>
          <span className='text-muted-foreground'>Status:</span>{' '}
          <span
            className={
              status === 'OPEN' ? 'text-green-700' : 'text-muted-foreground'
            }
          >
            {status}
          </span>
        </div>
      </div>

      {/* Collapsed status indicator (icon-rail) */}
      <div className='flex justify-center xl:hidden'>
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            status === 'OPEN' ? 'bg-green-600' : 'bg-muted-foreground/40'
          )}
          title={`Status: ${status}`}
        />
      </div>

      <nav className='space-y-1'>
        {sections.map(section => {
          const base = `/organisation/clients/${clientId}/accounting-periods/${periodId}`

          const href = `${base}/${section.href}`
          const full = `${base}${section.match}`

          const isActive = pathname === full || pathname.startsWith(`${full}/`)

          if (!section.enabled) {
            return (
              <div
                key={section.key}
                className='text-muted-foreground flex items-center justify-center rounded-md px-2 py-2 text-sm xl:justify-start xl:gap-2 xl:px-3'
                title={section.label}
              >
                <span className='inline-flex'>{section.icon}</span>
                <span className='hidden xl:inline'>{section.label}</span>
                <span className='ml-auto hidden text-xs xl:inline'>(???)</span>
              </div>
            )
          }

          return (
            <Link
              key={section.key}
              href={href}
              title={section.label}
              className={cn(
                // collapsed: centered icon button
                'flex items-center justify-center rounded-md py-2 text-sm transition-colors',
                'px-2',
                // expanded: normal row
                'sidebar:justify-start sidebar:gap-2 sidebar:px-3',
                isActive
                  ? 'bg-muted text-foreground font-medium dark:text-gray-800'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <span className='inline-flex'>{section.icon}</span>

              <span className='sidebar:block hidden min-w-0 truncate'>
                {section.label}
              </span>

              {section.key === 'planning' && (
                <span className='text-muted-foreground sidebar:inline ml-auto hidden text-xs tabular-nums'>
                  {props.planningCompletion.completed} /{' '}
                  {props.planningCompletion.total}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
