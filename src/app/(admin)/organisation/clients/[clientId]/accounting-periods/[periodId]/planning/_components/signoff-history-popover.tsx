'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { authClient } from '@/lib/auth-client'
import type { SignoffEvent } from '@/db/schema/planningDocSignoffs'
import SignoffHistoryList from './signoff-history-list'

type Props = {
  events: SignoffEvent[]
  align?: 'start' | 'center' | 'end'
}

export default function SignoffHistoryPopover({
  events,
  align = 'end'
}: Props) {
  const { data: activeOrganization } = authClient.useActiveOrganization()

  const members = React.useMemo(() => {
    const orgMembers = activeOrganization?.members ?? []
    return orgMembers
      .filter(m => m.user?.name)
      .map(m => ({ memberId: m.id, name: m.user!.name }))
  }, [activeOrganization?.members])

  const memberNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) map.set(m.memberId, m.name)
    return map
  }, [members])

  const hasEvents = events.length > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-7 px-2 text-xs'
          disabled={!hasEvents}
          title={hasEvents ? 'View signoff history' : 'No history yet'}
        >
          History
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className='w-96 max-w-[90vw]'
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <div className='space-y-2'>
          <div className='text-sm font-medium'>Signoff history</div>
          <SignoffHistoryList events={events} memberNameById={memberNameById} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
