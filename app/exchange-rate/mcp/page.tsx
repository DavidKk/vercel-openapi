import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'
import { McpOneClickInstallBar } from '@/components/McpOneClickInstallBar'

import { ExchangeRateMcpPlayground } from './components'

/**
 * Exchange rate MCP tools page.
 * Left: docs for get_exchange_rate and convert_currency. Right: playground.
 */
export default function ExchangeRateMcpPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Exchange rate MCP tools" subtitle="Tools exposed via MCP for fetching rates and converting currency." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <McpOneClickInstallBar endpointPath="/api/mcp/exchange-rate" className="mb-3" />
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp/exchange-rate" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Call with <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ tool, params }'}</code> to run a tool.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Available tools</h2>
          <ul className="mb-3 list-disc pl-4">
            <li className="mb-1">
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_exchange_rate</code> – Get rates for a base currency (params: base optional, default USD).
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">convert_currency</code> – Convert amount (params: from, to, amount).
            </li>
          </ul>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <ExchangeRateMcpPlayground />
        </div>
      </section>
    </div>
  )
}
