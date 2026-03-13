import { TbApi, TbCode, TbFileText, TbMovie, TbRobot } from 'react-icons/tb'

import { DashboardSidebar } from '@/components/DashboardSidebar'

interface MoviesLayoutProps {
  children: React.ReactNode
}

const MOVIES_SIDEBAR_ITEMS = [
  { href: '/movies', title: 'Latest', ariaLabel: 'Latest movies', icon: <TbMovie className="h-5 w-5" /> },
  { href: '/movies/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/movies/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/movies/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/movies/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Movies section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns Movies layout with sidebar and content area
 */
export default function MoviesLayout(props: Readonly<MoviesLayoutProps>) {
  const { children } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={MOVIES_SIDEBAR_ITEMS} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
