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
          subtitle="Same grouping as the finance sidebar: stocks (index snapshot + TASI-only exchange daily/hourly + constituents), funds (exchange daily bars vs NAV daily + overview stock-list), precious metals (no MCP — XAU demo page only)."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <McpOneClickInstallBar endpointPath="/api/mcp/finance" className="mb-3" />
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp/finance" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ "tool": "<name>", "params": { ... } }'}</code>.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Tools</h2>
          <ul className="mb-3 list-disc space-y-1.5 pl-4">
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_market_company_daily</code> — Saudi company rows (
              <code className="rounded bg-gray-100 px-0.5">market=TASI</code> only). Params: optional <code className="rounded bg-gray-100 px-0.5">market</code>,{' '}
              <code className="rounded bg-gray-100 px-0.5">date</code>, or <code className="rounded bg-gray-100 px-0.5">code</code>+
              <code className="rounded bg-gray-100 px-0.5">from</code>+<code className="rounded bg-gray-100 px-0.5">to</code>.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_market_summary_daily</code> — TASI index daily / K-line via feed+Turso (
              <code className="rounded bg-gray-100 px-0.5">market=TASI</code> only). Other indices → <code className="rounded bg-gray-100 px-0.5">get_stock_summary</code>.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_market_summary_hourly</code> — TASI SAHMK hourly alignment check (
              <code className="rounded bg-gray-100 px-0.5">market=TASI</code>).
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_market_daily</code> — OHLCV for six-digit symbols or{' '}
              <code className="rounded bg-gray-100 px-0.5">XAUUSD</code> (rejects fund NAV codes): <code className="rounded bg-gray-100 px-0.5">symbols</code>,{' '}
              <code className="rounded bg-gray-100 px-0.5">startDate</code>, <code className="rounded bg-gray-100 px-0.5">endDate</code>; optional{' '}
              <code className="rounded bg-gray-100 px-0.5">withIndicators</code>; optional <code className="rounded bg-gray-100 px-0.5">syncIfEmpty</code>.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_fund_nav_daily</code> — Fund NAV only (LSJZ): same date params; optional{' '}
              <code className="rounded bg-gray-100 px-0.5">syncIfEmpty</code>. Returns <code className="rounded bg-gray-100 px-0.5">unitNav</code> and{' '}
              <code className="rounded bg-gray-100 px-0.5">dailyChangePercent</code> per row.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_overview_stock_list</code> — Latest per symbol with MACD streak (stock.md):{' '}
              <code className="rounded bg-gray-100 px-0.5">symbols</code>, <code className="rounded bg-gray-100 px-0.5">startDate</code>,{' '}
              <code className="rounded bg-gray-100 px-0.5">endDate</code>; optional <code className="rounded bg-gray-100 px-0.5">syncIfEmpty</code>.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_stock_summary</code> — Latest snapshot: <code className="rounded bg-gray-100 px-0.5">market</code>{' '}
              or batch <code className="rounded bg-gray-100 px-0.5">markets</code> (comma-separated names).
            </li>
          </ul>
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
