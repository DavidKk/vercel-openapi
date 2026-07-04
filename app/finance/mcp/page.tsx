import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'
import { McpOneClickInstallBar } from '@/components/McpOneClickInstallBar'

import { TasiMcpPlayground } from './components'

/**
 * Finance MCP tools page. Left: docs; Right: playground.
 */
export default function FinanceMcpPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader
          title="Finance MCP tools"
          subtitle="Stocks: get_stock_summary (latest) and get_stock_summary_daily (history). Funds: OHLCV vs NAV + overview. XAUUSD via get_market_daily."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <McpOneClickInstallBar endpointPath="/api/mcp/finance" className="mb-3" />
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoint</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp/finance" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ "tool": "<name>", "params": { ... } }'}</code>. Returns tool result JSON (not the REST{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{`{ code, message, data }`}</code> envelope).
            </p>
          </div>

          <h2 className={DOC_SECTION_TITLE_CLASS}>Primary tools</h2>
          <p className="mb-2 text-[10px] leading-relaxed text-gray-600">
            Use these from agents and the playground. <strong className="font-medium">Latest index</strong> →{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">get_stock_summary</code>; <strong className="font-medium">historical / range</strong> →{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">get_stock_summary_daily</code>.
          </p>
          <ul className="mb-3 list-disc space-y-1.5 pl-4">
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_stock_summary</code> — Latest index snapshot:{' '}
              <code className="rounded bg-gray-100 px-0.5">market</code> or batch <code className="rounded bg-gray-100 px-0.5">markets</code>.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_stock_summary_daily</code> — Daily summary for one market: omit params for latest; optional{' '}
              <code className="rounded bg-gray-100 px-0.5">date</code> or <code className="rounded bg-gray-100 px-0.5">from</code>+
              <code className="rounded bg-gray-100 px-0.5">to</code> (max 365 days).
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_market_daily</code> /{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_market_daily_latest</code> — Six-digit or <code className="rounded bg-gray-100 px-0.5">XAUUSD</code>{' '}
              exchange OHLCV (not fund NAV).
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_fund_nav_daily</code> /{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_fund_nav_daily_latest</code> — Fund NAV (LSJZ) only.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_overview_stock_list</code> — Latest bar per symbol + MACD streak.
            </li>
          </ul>

          <h2 className={DOC_SECTION_TITLE_CLASS}>Removed tools</h2>
          <p className="text-[10px] leading-relaxed text-gray-600">
            <code className="rounded bg-gray-100 px-1 py-0.5">get_market_company_daily</code> and{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">get_market_company_daily_latest</code> — unregistered. TASI constituents are not supported; use{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">get_stock_summary</code>.
          </p>
        </div>
      </section>
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <TasiMcpPlayground />
        </div>
      </section>
    </div>
  )
}
