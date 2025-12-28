import type { NavSection } from './types'

export interface Breadcrumb {
  title: string
  href: string
}

export function resolveBreadcrumbs(
  nav: NavSection[],
  pathname: string
): Breadcrumb[] {
  const crumbs: Breadcrumb[] = []

  for (const section of nav) {
    if (pathname === section.href || pathname.startsWith(section.href + '/')) {
      crumbs.push({
        title: section.title,
        href: section.href
      })

      if (section.items) {
        const sub = section.items.find(
          item => pathname === item.href || pathname.startsWith(item.href + '/')
        )

        // ✅ only add if href is different
        if (sub && sub.href !== section.href) {
          crumbs.push({
            title: sub.title,
            href: sub.href
          })
        }
      }

      break
    }
  }

  return crumbs
}
