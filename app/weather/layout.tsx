import { TbApi, TbCode, TbFileText, TbRobot } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface WeatherLayoutProps {
  children: React.ReactNode
}

const SIDEBAR_ITEMS = [
  { href: '/weather', title: 'Overview', ariaLabel: 'Overview', icon: <TbFileText className="h-5 w-5" /> },
  { href: '/weather/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/weather/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/weather/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/weather/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Weather section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns Weather layout with sidebar and content area
 */
export default async function WeatherLayout(props: Readonly<WeatherLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(SIDEBAR_ITEMS, '/weather', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
