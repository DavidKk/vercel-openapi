'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { NAV_ICON_BTN_ACTIVE_SIDEBAR_CLASS, NAV_ICON_BTN_CLASS, NAV_ICON_BTN_INACTIVE_CLASS } from '@/app/Nav/constants'
import { isDashboardSidebarItemActive } from '@/components/dashboard-sidebar-utils'
import { ModuleNavRegistrar } from '@/components/ModuleNavContext'
import { Tooltip } from '@/components/Tooltip'

export interface DashboardSidebarItem {
  href: string
  title: string
  ariaLabel: string
  icon: React.ReactNode
  /**
   * When true, the item is active for `pathname === href` or `pathname` under `href/` (e.g. `/finance/stock/tasi`).
   */
  matchChildPaths?: boolean
}

interface DashboardSidebarProps {
  items: DashboardSidebarItem[]
  /** Main column; when set, wraps sidebar + children in `md:flex-row`. */
  children?: ReactNode
}

/**
 * Module sub-navigation: mobile menu is in the global app header (left of logo); icon sidebar from `md` up.
 * Parent layout should use `flex-col md:flex-row`.
 *
 * @param props Sidebar items (href, title, ariaLabel, icon)
 * @returns Registrar for mobile drawer + desktop icon sidebar
 */
export function DashboardSidebar(props: Readonly<DashboardSidebarProps>) {
  const pathname = usePathname() ?? ''
  const { items, children } = props

  const desktopSidebar = (
    <nav className="hidden w-14 shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-gray-200 bg-white px-0 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:flex">
      {items.map((item) => {
        const isActive = isDashboardSidebarItemActive(pathname, item)
        const className = `${NAV_ICON_BTN_CLASS} ${isActive ? NAV_ICON_BTN_ACTIVE_SIDEBAR_CLASS : NAV_ICON_BTN_INACTIVE_CLASS}`
        return (
          <Tooltip key={item.href} content={item.title} placement="right">
            <Link href={item.href} className={className} aria-label={item.ariaLabel} aria-current={isActive ? 'page' : undefined}>
              {item.icon}
            </Link>
          </Tooltip>
        )
      })}
    </nav>
  )

  if (children != null) {
    return (
      <>
        <ModuleNavRegistrar items={items} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {desktopSidebar}
          {children}
        </div>
      </>
    )
  }

  return (
    <>
      <ModuleNavRegistrar items={items} />
      {desktopSidebar}
    </>
  )
}
