import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { HolidayMcpPlayground } from './components'

/**
 * Holiday MCP tools page.
 * Left side documents holiday-related MCP tools, right side is a playground for POST /api/mcp.
 * @returns Holiday MCP tools page
 */
export default function HolidayMcpPage() {
  return (
    <div className="flex h-full">
      {/* Left: documentation */}
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col border-r border-gray-200 bg-white">
        <DocPanelHeader title="Holiday MCP tools" subtitle="Tools for checking holidays, workdays, and listing holiday data through the MCP server." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp" />
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
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col bg-gray-50">
        <div className="flex min-h-0 flex-1 flex-col">
          <HolidayMcpPlayground />
        </div>
      </section>
    </div>
  )
}
