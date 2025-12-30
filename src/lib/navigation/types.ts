export interface NavItem {
  label: string
  href: string
}

export interface NavSection {
  label: string
  href: string
  items?: NavItem[]
}
