import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { WeatherMcpPlayground } from '@/app/weather/mcp/components'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'
import { McpOneClickInstallBar } from '@/components/McpOneClickInstallBar'

/**
 * China Weather MCP tools page.
 * Left side documents MCP tools, right side is a playground for POST /api/mcp/weather.
 * @returns Weather MCP tools page
 */
export default function WeatherMcpPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      {/* Left: documentation */}
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="China Weather MCP tools" subtitle="Tools exposed via MCP for querying point-based weather." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <McpOneClickInstallBar endpointPath="/api/mcp/weather" className="mb-3" />
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp/weather" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Call with <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ tool, params }'}</code> to execute a single tool.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Available tools</h2>
          <ul className="mb-3 list-disc pl-4">
            <li className="mb-1">
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_point_weather</code> – Get current weather for a point (params: latitude, longitude).
            </li>
            <li className="mb-1">
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_point_forecast</code> – Get short-term forecast for a point (params: latitude, longitude,
              granularity, hours, days).
            </li>
          </ul>
        </div>
      </section>

      {/* Right: playground */}
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <WeatherMcpPlayground />
        </div>
      </section>
    </div>
  )
}
