// // components/navigation/breadcrumbs.tsx
// 'use client'

// import Link from 'next/link'
// import { ChevronRight } from 'lucide-react'

// import type { Breadcrumb } from '@/lib/navigation/breadcrumbs'
// import { useBreadcrumbContext } from './breadcrumb'

// export function Breadcrumbs({
//   baseCrumbs = []
// }: {
//   baseCrumbs?: Breadcrumb[]
// }) {
//   const { crumbs } = useBreadcrumbContext()

//   const allCrumbs = [...baseCrumbs, ...crumbs]

//   if (allCrumbs.length === 0) return null

//   return (
//     <nav aria-label='Breadcrumb' className='mb-4'>
//       <ol className='text-muted-foreground flex flex-wrap items-center text-sm'>
//         {allCrumbs.map((crumb, index) => (
//           <li key={crumb.href} className='flex items-center'>
//             {index > 0 && <ChevronRight className='mx-2 h-4 w-4 shrink-0' />}

//             {index === allCrumbs.length - 1 ? (
//               <span className='text-foreground font-medium'>{crumb.label}</span>
//             ) : (
//               <Link
//                 href={crumb.href}
//                 className='hover:text-foreground transition-colors'
//               >
//                 {crumb.label}
//               </Link>
//             )}
//           </li>
//         ))}
//       </ol>
//     </nav>
//   )
// }
