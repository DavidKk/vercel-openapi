import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Finance Function Calling page.
 * Exposes get_market_company_daily, get_market_summary_daily, get_market_summary_hourly, get_market_daily, and get_stock_summary as OpenAI-compatible tools.
 */
export default function FinanceFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Finance category includes market-aware TASI feed tools (optional market, default TASI), hourly alignment, six-digit market daily OHLCV, and multi-market stock summary — same names as POST /api/mcp/finance."
      defaultToolsCategory="finance"
    />
  )
}
