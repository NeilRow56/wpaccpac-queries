'use client'

import { useState } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

import { authClient } from '@/lib/auth-client'
import { MemberActionsMenu } from './member-actions-menu'
import { ArchivedCell } from './member-row'

type MembersTabProps = {
  canAccessAdmin: boolean
}

export function MembersTab({ canAccessAdmin }: MembersTabProps) {
  const { data: activeOrganization, refetch } =
    authClient.useActiveOrganization()
  const { data: session } = authClient.useSession()

  /**
   * Incrementing this value forces ArchivedCell to refetch
   * after archive / reinstate actions.
   */
  const [refreshKey, ,] = useState(0)

  if (!activeOrganization) return null

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Date joined</TableHead>
          <TableHead>Archived</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {activeOrganization.members.map(member => {
          const isSelf = member.userId === session?.user?.id
          const isOwner = member.role === 'owner'

          return (
            <TableRow key={member.id}>
              <TableCell>{member.user.name}</TableCell>
              <TableCell>{member.user.email}</TableCell>

              <TableCell>
                {new Date(member.createdAt).toLocaleDateString('en-GB')}
              </TableCell>

              <TableCell className=''>
                <ArchivedCell
                  userId={member.userId}
                  refreshTrigger={refreshKey}
                />
              </TableCell>

              <TableCell>
                <Badge
                  variant={
                    member.role === 'owner'
                      ? 'default'
                      : member.role === 'admin'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {member.role}
                </Badge>
              </TableCell>

              <TableCell className='text-right'>
                {canAccessAdmin && !isSelf && !isOwner && (
                  <>
                    <MemberActionsMenu
                      userId={member.userId}
                      memberId={member.id}
                      initialRole={member.role === 'admin' ? 'admin' : 'member'}
                      initialArchived={false} // UI hint only – real state fetched internally
                      refetchOrganization={refetch}
                    />
                  </>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
