import { TbApi, TbFileText, TbMapPin, TbRobot } from 'react-icons/tb'

import { DashboardSidebar } from '@/components/DashboardSidebar'

interface GeoLayoutProps {
  children: React.ReactNode
}

const GEO_SIDEBAR_ITEMS = [
  { href: '/geo', title: 'Overview', ariaLabel: 'Overview', icon: <TbMapPin className="h-5 w-5" /> },
  { href: '/geo/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/geo/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/geo/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Geo section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns Geo layout with sidebar and content area
 */
export default function GeoLayout(props: Readonly<GeoLayoutProps>) {
  const { children } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={GEO_SIDEBAR_ITEMS} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
