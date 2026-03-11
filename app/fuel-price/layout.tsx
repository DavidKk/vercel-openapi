import { TbApi, TbFileText, TbGasStation, TbRobot } from 'react-icons/tb'

import { DashboardSidebar } from '@/components/DashboardSidebar'

interface FuelPriceLayoutProps {
  children: React.ReactNode
}

const FUEL_PRICE_SIDEBAR_ITEMS = [
  { href: '/fuel-price', title: 'Overview', ariaLabel: 'Overview', icon: <TbGasStation className="h-5 w-5" /> },
  { href: '/fuel-price/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/fuel-price/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/fuel-price/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Fuel price section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns Fuel price layout with sidebar and content area
 */
export default function FuelPriceLayout(props: Readonly<FuelPriceLayoutProps>) {
  const { children } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={FUEL_PRICE_SIDEBAR_ITEMS} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
