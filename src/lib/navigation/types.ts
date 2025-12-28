export interface NavItem {
  title: string
  href: string
}

export interface NavSection {
  title: string
  href: string
  items?: NavItem[]
}
