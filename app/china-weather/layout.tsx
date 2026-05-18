import { TbApi, TbCode, TbFileText, TbRobot } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface WeatherLayoutProps {
  children: React.ReactNode
}

const SIDEBAR_ITEMS = [
  { href: '/china-weather', title: 'Overview', ariaLabel: 'Overview', icon: <TbFileText className="h-5 w-5" /> },
  { href: '/china-weather/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/china-weather/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/china-weather/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/china-weather/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * China Weather section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns China Weather layout with sidebar and content area
 */
export default async function WeatherLayout(props: Readonly<WeatherLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(SIDEBAR_ITEMS, '/china-weather', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)]">{children}</main>
      </div>
    </div>
  )
}
