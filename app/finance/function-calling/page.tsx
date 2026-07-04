import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Finance Function Calling page.
 * Exposes primary finance MCP tools as OpenAI-compatible tools (legacy TASI feed tools remain registered).
 */
export default function FinanceFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle={
        'Finance tools match POST /api/mcp/finance: primary — get_stock_summary for TASI and all index markets; get_market_daily* / get_fund_nav_daily* for funds and XAUUSD; get_overview_stock_list. ' +
        'Legacy TASI feed tools (get_market_summary_daily*, get_market_summary_hourly) remain registered for historical K-line only. Company tools removed.'
      }
      defaultToolsCategory="finance"
    />
  )
}
