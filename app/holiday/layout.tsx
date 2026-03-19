import { TbApi, TbCalendarSearch, TbCode, TbFileText, TbRobot } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface HolidayLayoutProps {
  children: React.ReactNode
}

const HOLIDAY_SIDEBAR_ITEMS = [
  { href: '/holiday', title: 'Calendar', ariaLabel: 'Calendar', icon: <TbCalendarSearch className="h-5 w-5" /> },
  { href: '/holiday/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/holiday/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/holiday/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/holiday/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Holiday section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns Holiday layout with sidebar and content area
 */
export default async function HolidayLayout(props: Readonly<HolidayLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(HOLIDAY_SIDEBAR_ITEMS, '/holiday', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
