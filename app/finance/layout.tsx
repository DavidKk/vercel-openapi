import { TbApi, TbChartLine, TbCode, TbCurrencyDollar, TbFileText, TbRobot, TbWorld } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface FinanceLayoutProps {
  children: React.ReactNode
}

const FINANCE_SIDEBAR_ITEMS = [
  {
    href: '/finance/stock',
    title: 'Stock Overview',
    ariaLabel: 'Stock Overview',
    icon: <TbChartLine className="h-5 w-5" />,
    matchChildPaths: true,
  },
  {
    href: '/finance/fund',
    title: 'Fund Overview',
    ariaLabel: 'Fund Overview',
    icon: <TbCurrencyDollar className="h-5 w-5" />,
    matchChildPaths: true,
  },
  {
    href: '/finance/gold',
    title: 'Gold Overview',
    ariaLabel: 'Gold Overview',
    icon: <TbWorld className="h-5 w-5" />,
    matchChildPaths: true,
  },
  { href: '/finance/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/finance/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/finance/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/finance/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Finance section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns Finance layout with sidebar and content area
 */
export default async function FinanceLayout(props: Readonly<FinanceLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(FINANCE_SIDEBAR_ITEMS, '/finance', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
