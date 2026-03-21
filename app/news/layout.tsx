import { TbApi, TbCode, TbFileText, TbNews, TbRobot } from 'react-icons/tb'

import { withManageSidebarItem } from '@/components/dashboard-sidebar-items'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { validateCookie } from '@/services/auth/access'

interface NewsLayoutProps {
  children: React.ReactNode
}

const NEWS_SIDEBAR_ITEMS = [
  { href: '/news/headlines', title: 'Overview', ariaLabel: 'News overview', icon: <TbNews className="h-5 w-5" /> },
  { href: '/news/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/news/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/news/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/news/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * News section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns News layout with sidebar and content area
 */
export default async function NewsLayout(props: Readonly<NewsLayoutProps>) {
  const { children } = props
  const isAuthenticated = await validateCookie()
  const sidebarItems = withManageSidebarItem(NEWS_SIDEBAR_ITEMS, '/news', isAuthenticated)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={sidebarItems} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
