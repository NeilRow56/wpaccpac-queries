// app/organisations/clients/[clientId]/accounting-periods/layout.tsx

export default async function AccountingPeriodsLayout({
  children
}: {
  children: React.ReactNode
}) {
  //   const crumbs: Breadcrumb[] = [
  //     {
  //       label: 'Accounting Periods',
  //       href: `/organisations/clients/${clientId}/accounting-periods`
  //     }
  //   ]

  return (
    <>
      {/* <Breadcrumbs baseCrumbs={crumbs} /> */}
      {children}
    </>
  )
}
