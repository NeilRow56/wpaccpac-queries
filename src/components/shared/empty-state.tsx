import { FileIcon } from 'lucide-react'

interface iAppProps {
  title: string
  description: string
}

export function EmptyState({ description, title }: iAppProps) {
  return (
    <div className='animate-fadeIn flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center'>
      <div className='bg-primary/10 flex size-20 items-center justify-center rounded-full'>
        <FileIcon className='text-primary size-10' />
      </div>
      <h2 className='mt-6 text-xl font-semibold'>{title}</h2>
      <p className='text-muted-foreground mx-auto mt-2 mb-8 max-w-sm text-center text-sm leading-tight'>
        {description}
      </p>
    </div>
  )
}
