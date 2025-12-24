'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { MemberActionsMenu } from './member-actions-menu'
import { getUserArchiveInfo } from '@/server-actions/users'
import { roleBadgeClass } from '@/lib/color-switcher'

const PAGE_SIZE = 8

export function MembersTab({ canAccessAdmin }: { canAccessAdmin: boolean }) {
  const { data: activeOrganization, refetch } =
    authClient.useActiveOrganization()
  const { data: session } = authClient.useSession()

  const [archivedMap, setArchivedMap] = useState<Record<string, boolean>>({})
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(id)
  }, [search])

  /* -----------------------------
     FETCH ARCHIVE STATUS
  ----------------------------- */
  useEffect(() => {
    if (!activeOrganization) return

    Promise.all(
      activeOrganization.members.map(async m => {
        const archivedAt = await getUserArchiveInfo(m.userId)
        return [m.userId, Boolean(archivedAt)] as const
      })
    ).then(entries => {
      setArchivedMap(Object.fromEntries(entries))
    })
  }, [activeOrganization])

  /* -----------------------------
     SORT MEMBERS
  ----------------------------- */
  const sortedMembers = useMemo(() => {
    if (!activeOrganization) return []

    return [...activeOrganization.members].sort((a, b) => {
      const aArchived = archivedMap[a.userId] ?? false
      const bArchived = archivedMap[b.userId] ?? false

      if (aArchived !== bArchived) {
        return aArchived ? 1 : -1
      }

      return 0
    })
  }, [activeOrganization, archivedMap])

  const filteredMembers = useMemo(() => {
    if (!debouncedSearch) return sortedMembers

    const q = debouncedSearch.toLowerCase()

    return sortedMembers.filter(m => {
      return (
        m.user.name?.toLowerCase().includes(q) ||
        m.user.email?.toLowerCase().includes(q)
      )
    })
  }, [sortedMembers, debouncedSearch])

  /* -----------------------------
     PAGINATION
  ----------------------------- */
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))

  const safePage = Math.min(page, totalPages)

  const pagedMembers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredMembers.slice(start, start + PAGE_SIZE)
  }, [filteredMembers, safePage])

  /* -----------------------------
     SAFE EARLY RETURN (AFTER HOOKS)
  ----------------------------- */
  if (!activeOrganization) return null

  const ownerCount = activeOrganization.members.filter(
    m => m.role === 'owner'
  ).length

  /* -----------------------------
     RENDER
  ----------------------------- */
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(1) // ✅ reset immediately
          }}
          placeholder='Search members…'
          className='h-9 w-full max-w-sm rounded-md border px-3 text-sm'
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Archived</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pagedMembers.map(member => {
            const isSelf = member.userId === session?.user?.id
            const isArchived = archivedMap[member.userId] ?? false

            return (
              <TableRow
                key={member.id}
                className={isArchived ? 'opacity-60' : ''}
              >
                <TableCell>{member.user.name}</TableCell>
                <TableCell>{member.user.email}</TableCell>
                <TableCell>
                  {new Date(member.createdAt).toLocaleDateString('en-GB')}
                </TableCell>
                <TableCell>
                  {isArchived ? (
                    <span className='text-red-500'>Archived</span>
                  ) : (
                    '—'
                  )}
                </TableCell>

                <TableCell>
                  <Badge className={roleBadgeClass(member.role)}>
                    {member.role}
                  </Badge>
                </TableCell>

                <TableCell className='text-right'>
                  {canAccessAdmin && !isSelf && (
                    <MemberActionsMenu
                      userId={member.userId}
                      memberId={member.id}
                      initialRole={member.role}
                      initialArchived={isArchived}
                      ownerCount={ownerCount}
                      onArchivedChange={archived =>
                        setArchivedMap(m => ({
                          ...m,
                          [member.userId]: archived
                        }))
                      }
                      refetchOrganization={refetch}
                    />
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* PAGINATION */}
      <div className='flex items-center justify-between'>
        <span className='text-muted-foreground text-sm'>
          Page {safePage} of {totalPages}
        </span>

        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={safePage === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>

          <Button
            variant='outline'
            size='sm'
            disabled={safePage === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
