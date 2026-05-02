import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Finance Function Calling page.
 * Exposes get_market_company_daily, get_market_summary_daily, get_market_summary_hourly, get_market_daily, get_fund_nav_daily,
 * get_overview_stock_list, and get_stock_summary as OpenAI-compatible tools.
 */
export default function FinanceFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle={
        'Finance tools match the sidebar taxonomy: stocks (multi-market snapshot + TASI exchange index/company/hourly), ' +
        'funds (six-digit OHLCV vs NAV daily + overview stock-list); precious metals have no MCP tools yet — same tool names as POST /api/mcp/finance.'
      }
      defaultToolsCategory="finance"
    />
  )
}
