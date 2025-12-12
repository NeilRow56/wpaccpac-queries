import { cn } from '@/lib/utils'
import { Column } from '@tanstack/react-table'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { Button } from '../ui/button'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { DropdownMenuContent } from '@radix-ui/react-dropdown-menu'

interface DataTableColumnHeaderProps<
  TData,
  TValue
> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export default function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className='data-[state=open]:bg-accent text-primary -ml-3 h-8 font-bold'
          >
            <span>{title}</span>

            {column.getIsSorted() === 'desc' ? (
              <ArrowDown />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp />
            ) : (
              <ChevronsUpDown />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='rounded-lg bg-gray-200'>
          <DropdownMenuItem
            className=''
            variant='destructive'
            onClick={() => column.toggleSorting(false)}
          >
            <ArrowUp className='' />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem
            variant='destructive'
            onClick={() => column.toggleSorting(true)}
          >
            <ArrowDown className='text-white' />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
