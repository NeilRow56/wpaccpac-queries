// lib/navigation/use-register-breadcrumbs.ts
// 'use client'

// import { useEffect } from 'react'
// import { Breadcrumb } from './navigation/breadcrumbs'
// import { useBreadcrumbContext } from './navigation/breadcrumb-context'

// export function useRegisterBreadcrumbs(crumbs: Breadcrumb[]) {
//   const { pushCrumbs } = useBreadcrumbContext()

//   useEffect(() => {
//     pushCrumbs(crumbs)
//     return () => pushCrumbs([])
//   }, [crumbs, pushCrumbs])
// }
