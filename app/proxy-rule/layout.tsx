import { TbApi, TbCode, TbFileText, TbFilter, TbRobot } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface ProxyRuleLayoutProps {
  children: React.ReactNode
}

const PROXY_RULE_SIDEBAR_ITEMS = [
  { href: '/proxy-rule', title: 'Overview', ariaLabel: 'Overview', icon: <TbFilter className="h-5 w-5" /> },
  { href: '/proxy-rule/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/proxy-rule/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/proxy-rule/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/proxy-rule/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Proxy rule module layout: sidebar + main. Global Nav is provided by app shell.
 */
export default async function ProxyRuleLayout(props: Readonly<ProxyRuleLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(PROXY_RULE_SIDEBAR_ITEMS, '/proxy-rule', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
