import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { SkeletonButton, SkeletonText } from './skeleton'

export function SkeletonCustomerCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <SkeletonText className='w-3/4' />
        </CardTitle>
        <CardDescription>
          <SkeletonText className='w-1/2' />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SkeletonText rows={3} />
      </CardContent>
      <CardFooter>
        <SkeletonButton />
      </CardFooter>
    </Card>
  )
}
