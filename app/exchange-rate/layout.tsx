import { TbApi, TbCode, TbCurrencyDollar, TbFileText, TbRobot } from 'react-icons/tb'

import { DashboardSidebar } from '@/components/DashboardSidebar'

interface ExchangeRateLayoutProps {
  children: React.ReactNode
}

const EXCHANGE_RATE_SIDEBAR_ITEMS = [
  { href: '/exchange-rate', title: 'Overview', ariaLabel: 'Overview', icon: <TbCurrencyDollar className="h-5 w-5" /> },
  { href: '/exchange-rate/api', title: 'API', ariaLabel: 'API', icon: <TbApi className="h-5 w-5" /> },
  { href: '/exchange-rate/mcp', title: 'MCP tools', ariaLabel: 'MCP tools', icon: <TbRobot className="h-5 w-5" /> },
  { href: '/exchange-rate/function-calling', title: 'Function Calling', ariaLabel: 'Function Calling', icon: <TbCode className="h-5 w-5" /> },
  { href: '/exchange-rate/skill', title: 'Skill', ariaLabel: 'Skill', icon: <TbFileText className="h-5 w-5" /> },
]

/**
 * Exchange rate section layout: left icon sidebar + main content. Header is the global Nav.
 * @param props Layout props containing page children
 * @returns Exchange rate layout with sidebar and content area
 */
export default function ExchangeRateLayout(props: Readonly<ExchangeRateLayoutProps>) {
  const { children } = props

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DashboardSidebar items={EXCHANGE_RATE_SIDEBAR_ITEMS} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
