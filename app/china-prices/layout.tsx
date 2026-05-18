import { MdPriceCheck } from 'react-icons/md'
import { TbApi, TbCode, TbFileText, TbRobot } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface PricesLayoutProps {
  children: React.ReactNode
}

const PRICES_SIDEBAR_ITEMS = [
  { href: '/china-prices', title: 'Overview', ariaLabel: 'Overview', icon: <MdPriceCheck className="h-5 w-5" /> },
  { href: '/china-prices/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/china-prices/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/china-prices/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/china-prices/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Prices module layout with sidebar and main content.
 * @param props Layout props
 * @returns Prices layout
 */
export default async function PricesLayout(props: Readonly<PricesLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(PRICES_SIDEBAR_ITEMS, '/china-prices', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)]">{children}</main>
      </div>
    </div>
  )
}
