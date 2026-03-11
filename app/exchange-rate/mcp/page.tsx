import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { ExchangeRateMcpPlayground } from './components'

/**
 * Exchange rate MCP tools page.
 * Left: docs for get_exchange_rate and convert_currency. Right: playground.
 */
export default function ExchangeRateMcpPage() {
  return (
    <div className="flex h-full">
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col border-r border-gray-200 bg-white">
        <DocPanelHeader title="Exchange rate MCP tools" subtitle="Tools exposed via MCP for fetching rates and converting currency." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp" />
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

      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col bg-gray-50">
        <div className="flex min-h-0 flex-1 flex-col">
          <ExchangeRateMcpPlayground />
        </div>
      </section>
    </div>
  )
}
