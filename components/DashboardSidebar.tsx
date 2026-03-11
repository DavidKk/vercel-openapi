'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Tooltip } from '@/components/Tooltip'

export interface DashboardSidebarItem {
  href: string
  title: string
  ariaLabel: string
  icon: React.ReactNode
}

interface DashboardSidebarProps {
  items: DashboardSidebarItem[]
}

const linkBase = 'flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-gray-100 hover:text-gray-900'
const linkActive = 'bg-gray-900 text-white shadow-sm hover:bg-gray-800 hover:text-white'
const linkInactive = 'text-gray-500'

/**
 * Icon-only sidebar that highlights the link matching the current pathname.
 * Used in fuel-price, holiday, and geo dashboard layouts.
 * @param props Sidebar items (href, title, ariaLabel, icon)
 * @returns Nav element with icon links and active state
 */
export function DashboardSidebar(props: Readonly<DashboardSidebarProps>) {
  const pathname = usePathname()
  const { items } = props

  return (
    <nav className="flex w-14 flex-col items-center gap-3 border-r border-gray-200 bg-white py-3">
      {items.map((item) => {
        const isActive = pathname === item.href
        const className = [linkBase, isActive ? linkActive : linkInactive].join(' ')
        return (
          <Tooltip key={item.href} content={item.title} placement="right">
            <Link href={item.href} className={className} aria-label={item.ariaLabel}>
              {item.icon}
            </Link>
          </Tooltip>
        )
      })}
    </nav>
  )
}
