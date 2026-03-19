import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { PricesMcpPlayground } from './components'

/**
 * Prices MCP page with docs and interactive playground.
 * @returns MCP documentation and playground
 */
export default function PricesMcpPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 w-[85vw] min-w-[280px] flex-shrink-0 flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Prices MCP tools" subtitle="Public MCP tools for listing, searching, and calculating price comparisons." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/mcp/prices" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>Returns prices module MCP manifest and tool schemas.</p>
          </div>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp/prices" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>Executes a module-scoped tool call for prices category.</p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Available prices tools</h2>
          <ul className="list-disc pl-4 text-[11px] text-gray-700">
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">list_price_lists</code> - list supported price lists and counts.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">search_prices</code> - search products by keyword.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">calc_prices</code> - calculate comparison results by product and total input.
            </li>
          </ul>
        </div>
      </section>

      <section className="flex h-full min-h-0 w-[85vw] min-w-[280px] flex-shrink-0 flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <PricesMcpPlayground />
        </div>
      </section>
    </div>
  )
}
