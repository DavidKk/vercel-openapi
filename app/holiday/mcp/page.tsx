import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'
import { McpOneClickInstallBar } from '@/components/McpOneClickInstallBar'

import { HolidayMcpPlayground } from './components'

/**
 * Holiday MCP tools page.
 * Left side documents holiday-related MCP tools, right side is a playground for POST /api/mcp/holiday.
 * @returns Holiday MCP tools page
 */
export default function HolidayMcpPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      {/* Left: documentation */}
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Holiday MCP tools" subtitle="Tools for checking holidays, workdays, and listing holiday data through the MCP server." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <McpOneClickInstallBar endpointPath="/api/mcp/holiday" className="mb-3" />
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp/holiday" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Call with <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ tool, params }'}</code> to execute a single tool.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Available holiday tools</h2>
          <ul className="mb-3 list-disc pl-4">
            <li className="mb-1">
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_today_holiday</code> – get today&#39;s holiday information.
            </li>
            <li className="mb-1">
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">list_holiday</code> – list holidays for a given year.
            </li>
            <li className="mb-1">
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">is_workday</code> – check if a date is a workday.
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">is_holiday</code> – check if a date is a holiday.
            </li>
          </ul>
        </div>
      </section>

      {/* Right: playground */}
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <HolidayMcpPlayground />
        </div>
      </section>
    </div>
  )
}
