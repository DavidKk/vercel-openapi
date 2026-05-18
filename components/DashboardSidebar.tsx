'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isDashboardSidebarItemActive } from '@/components/dashboard-sidebar-utils'
import { MobileModuleNav } from '@/components/MobileModuleNav'
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
}

const linkBase = 'flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-gray-100 hover:text-gray-900'
const linkActive = 'bg-gray-900 text-white shadow-sm hover:bg-gray-800 hover:text-white'
const linkInactive = 'text-gray-500'

/**
 * Module sub-navigation: mobile drawer bar + icon sidebar from `md` up.
 * Parent layout should use `flex-col md:flex-row` so the mobile bar spans full width above main.
 *
 * @param props Sidebar items (href, title, ariaLabel, icon)
 * @returns Mobile nav bar and desktop icon sidebar
 */
export function DashboardSidebar(props: Readonly<DashboardSidebarProps>) {
  const pathname = usePathname() ?? ''
  const { items } = props

  return (
    <>
      <MobileModuleNav items={items} />
      <nav className="hidden w-14 shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-gray-200 bg-white px-0 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:flex">
        {items.map((item) => {
          const isActive = isDashboardSidebarItemActive(pathname, item)
          const className = [linkBase, isActive ? linkActive : linkInactive].join(' ')
          return (
            <Tooltip key={item.href} content={item.title} placement="right">
              <Link href={item.href} className={className} aria-label={item.ariaLabel} aria-current={isActive ? 'page' : undefined}>
                {item.icon}
              </Link>
            </Tooltip>
          )
        })}
      </nav>
    </>
  )
}
