import { TbApi, TbCode, TbFileText, TbMapPin, TbRobot } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface GeoLayoutProps {
  children: React.ReactNode
}

const GEO_SIDEBAR_ITEMS = [
  { href: '/geo', title: 'Overview', ariaLabel: 'Overview', icon: <TbMapPin className="h-5 w-5" /> },
  { href: '/geo/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/geo/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/geo/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/geo/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * China GEO section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns China GEO layout with sidebar and content area
 */
export default async function GeoLayout(props: Readonly<GeoLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(GEO_SIDEBAR_ITEMS, '/geo', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
