// // app/(admin)/clients/[clientId]/accounting-periods/[periodId]/page.tsx
// import { useEffect } from 'react'
// import { useBreadcrumbContext } from '@/lib/navigation/breadcrumb-context'
// import { getAccountingPeriod } from '@/server-actions/accounting-periods' // your DB fetch

// interface AccountingPeriodPageProps {
//   params: { clientId: string; periodId: string }
// }

// export default async function AccountingPeriodPage({ params }: AccountingPeriodPageProps) {
//   const { clientId, periodId } = params
//   const period = await getAccountingPeriod(periodId) // returns { id, name, ... }

//   return <ClientAccountingPeriodContent period={period} clientId={clientId} />
// }

// // Client component is client-side, to set dynamic breadcrumbs
// 'use client'
// import React from 'react'

// export function ClientAccountingPeriodContent({
//   clientId,
//   period
// }: {
//   clientId: string
//   period: { id: string; name: string }
// }) {
//   const [, setBreadcrumbContext] = useBreadcrumbContext()

//   React.useEffect(() => {
//     setBreadcrumbContext({
//       periodName: period.name // dynamic label
//     })
//     return () => setBreadcrumbContext({})
//   }, [period.name, setBreadcrumbContext])

//   return (
//     <div>
//       <h1>{period.name}</h1>
//       <p>Accounting period details for client {clientId}</p>
//     </div>
//   )
// }

import React from 'react'

export default function IndividualAccountingPeriod() {
  return <div>Individual Accounting Period</div>
}
