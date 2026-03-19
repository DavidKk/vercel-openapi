import { TbApi, TbCode, TbFileText, TbRobot, TbWorld } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface DnsLayoutProps {
  children: React.ReactNode
}

const DNS_SIDEBAR_ITEMS = [
  { href: '/dns', title: 'Overview', ariaLabel: 'Overview', icon: <TbWorld className="h-5 w-5" /> },
  { href: '/dns/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/dns/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/dns/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/dns/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * DNS Query section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns DNS Query layout with sidebar and content area
 */
export default async function DnsLayout(props: Readonly<DnsLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(DNS_SIDEBAR_ITEMS, '/dns', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
