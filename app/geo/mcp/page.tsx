import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { GeoMcpPlayground } from './components'

/**
 * Geolocation MCP page.
 * Left: MCP usage doc (no geo-specific tools in this server). Right: generic MCP playground.
 */
export default function GeoMcpPage() {
  return (
    <div className="flex h-full">
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col border-r border-gray-200 bg-white">
        <DocPanelHeader title="Geolocation MCP" subtitle="This server does not expose geo-specific MCP tools. Use POST /api/mcp to call other tools (e.g. fuel, holiday)." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ tool, params }'}</code>. Use the playground to call any registered tool.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col bg-gray-50">
        <div className="flex min-h-0 flex-1 flex-col">
          <GeoMcpPlayground />
        </div>
      </section>
    </div>
  )
}
