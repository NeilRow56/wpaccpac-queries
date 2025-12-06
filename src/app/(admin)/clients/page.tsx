import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ClientsPage() {
  return (
    <div>
      <h1>Clients Page</h1>
      <p>Welcome to the clients page.</p>
      <Button asChild>
        <Link href='/clients/categories'>Add Category </Link>
      </Button>
    </div>
  )
}
