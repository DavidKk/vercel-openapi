import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Finance Function Calling page.
 * Exposes finance MCP tools as OpenAI-compatible tools.
 */
export default function FinanceFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle={
        'Finance tools match POST /api/mcp/finance: get_stock_summary (latest index), get_stock_summary_daily (history/range), ' +
        'get_market_daily* / get_fund_nav_daily* for funds and XAUUSD, get_overview_stock_list.'
      }
      defaultToolsCategory="finance"
    />
  )
}
