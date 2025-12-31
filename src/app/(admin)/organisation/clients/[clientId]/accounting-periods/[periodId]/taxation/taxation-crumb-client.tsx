// // taxation-crumb-client.tsx
// 'use client'

// import { useEffect } from 'react'

// export default function TaxationCrumb({
//   clientId,
//   periodId
// }: {
//   clientId: string
//   periodId: string
// }) {
//   const { pushCrumbs } = useBreadcrumbContext()

//   useEffect(() => {
//     pushCrumbs([
//       {
//         label: 'Taxation',
//         href: `/organisation/clients/${clientId}/accounting-periods/${periodId}/taxation`
//       }
//     ])
//   }, [clientId, periodId, pushCrumbs])

//   return null
// }
