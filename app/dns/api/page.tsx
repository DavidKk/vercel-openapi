import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { DnsApiPlayground } from './components'

/**
 * DNS Query REST API page.
 * Left: documentation for GET /api/dns. Right: interactive playground.
 */
export default function DnsApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader
          title="DNS Query API"
          subtitle="GET /api/dns with optional L0 cache. Query a domain against a configurable DNS server (IP or DoH). Returns latest resolution only (no history)."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/dns" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Query: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">domain</code> (required),{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">dns</code> (optional, default 1.1.1.1). Returns A and AAAA records in one response.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Response example</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "records": [
    { "name": "example.com", "type": "A", "ttl": 300, "data": "93.184.216.34" },
    { "name": "example.com", "type": "AAAA", "ttl": 300, "data": "2606:2800:220:1:248:1893:25c8:1946" }
  ],
  "domain": "example.com",
  "dns": "1.1.1.1"
}`}
          </pre>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <DnsApiPlayground />
        </div>
      </section>
    </div>
  )
}
