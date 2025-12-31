// 'use client'

// import { useRegisterBreadcrumbs } from '@/lib/use-register-breadcrumbs'

// interface PeriodBreadcrumbsProps {
//   clientId: string
//   period: {
//     id: string
//     periodName: string
//   } | null
// }

// export function PeriodBreadcrumbs({
//   clientId,
//   period
// }: PeriodBreadcrumbsProps) {
//   // ✅ Always call the hook
//   useRegisterBreadcrumbs(
//     period
//       ? [
//           {
//             label: 'Accounting Periods',
//             href: `/organisation/clients/${clientId}/accounting-periods`
//           },
//           {
//             label: period.periodName,
//             href: `/organisation/clients/${clientId}/accounting-periods/${period.id}`
//           }
//         ]
//       : []
//   )

//   // Rendering can still be conditional
//   if (!period) return null

//   return null
// }
