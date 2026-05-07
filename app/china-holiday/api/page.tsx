import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { HolidayApiPlayground } from './components'

/**
 * Holiday REST API page.
 * Left side shows documentation for /api/holiday, right side is an interactive playground.
 */
export default function HolidayApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      {/* Left: documentation */}
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Holiday API" subtitle="Check whether today is a holiday and get the holiday name." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/holiday" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Returns a JSON object with <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">isHoliday</code> and{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">name</code>.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Response example</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "isHoliday": true,
  "name": "National Day"
}`}
          </pre>
        </div>
      </section>

      {/* Right: playground */}
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <HolidayApiPlayground />
        </div>
      </section>
    </div>
  )
}
