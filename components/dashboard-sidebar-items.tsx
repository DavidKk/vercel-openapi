import { TbSettings } from 'react-icons/tb'

import { MODULES_WITH_MANAGER_PAGES } from '@/app/Nav/utils'

import type { DashboardSidebarItem } from './DashboardSidebar'

/**
 * Build sidebar items by appending module management entry when user is authenticated.
 * @param items Base sidebar items for the module
 * @param modulePath Module root path such as "/geo"
 * @param authenticated Whether current user is authenticated
 * @returns Sidebar items with optional management entry
 */
export function withManageSidebarItem(items: DashboardSidebarItem[], modulePath: string, authenticated: boolean): DashboardSidebarItem[] {
  if (!authenticated) {
    return items
  }

  const moduleSlug = modulePath.replace(/^\/+/, '').split('/')[0]
  if (!MODULES_WITH_MANAGER_PAGES.has(moduleSlug)) {
    return items
  }

  return [
    ...items,
    {
      href: `${modulePath}/manage`,
      title: 'Manage',
      ariaLabel: 'Manage',
      icon: <TbSettings className="h-5 w-5" />,
    },
  ]
}
