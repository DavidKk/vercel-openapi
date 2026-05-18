import type { DashboardSidebarItem } from './DashboardSidebar'

/**
 * Whether the sidebar item matches the current pathname (exact or prefix when `matchChildPaths`).
 * @param pathname Current pathname from the router
 * @param item Sidebar item definition
 * @returns True when the item should be marked active
 */
export function isDashboardSidebarItemActive(pathname: string, item: DashboardSidebarItem): boolean {
  return pathname === item.href || Boolean(item.matchChildPaths && pathname.startsWith(`${item.href}/`))
}

/**
 * Resolve the best-matching active sidebar item (longest `href` wins for nested routes).
 * @param pathname Current pathname from the router
 * @param items Sidebar items for the module
 * @returns Active item or undefined
 */
export function findActiveDashboardSidebarItem(pathname: string, items: DashboardSidebarItem[]): DashboardSidebarItem | undefined {
  const matches = items.filter((item) => isDashboardSidebarItemActive(pathname, item))
  if (matches.length === 0) return undefined
  return matches.sort((a, b) => b.href.length - a.href.length)[0]
}
