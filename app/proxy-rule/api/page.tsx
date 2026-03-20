import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { CompactJsonViewer } from '@/components/CompactJsonViewer'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { ProxyRuleApiPlayground } from './components'

/**
 * Proxy rule REST API documentation and playground.
 */
export default function ProxyRuleApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Proxy rule API" subtitle="Public merged Clash RULE-SET lines and authenticated gist updates." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/proxy-rule/clash/config?type=Proxy" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Public. Returns <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">payload</code>: string[] (Clash RULE-SET line prefixes) for rules whose action matches{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">type</code> (case-insensitive). Merges gist rules, optional ZeroOmega gist, and gfwlist.
            </p>
          </div>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/proxy-rule/admin/clash" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Requires login cookie. Returns current <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">rules</code> and
            </p>
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">actions</code> from gist.
            </p>
          </div>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/proxy-rule/admin/clash" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Requires login cookie. Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ "rules": [...] }'}</code> — full Clash rule objects (same shape as
              GET).
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Example (success)</h2>
          <div className="max-h-64 overflow-auto">
            <CompactJsonViewer
              value={`{
  "code": 0,
  "message": "ok",
  "data": {
    "payload": ["DOMAIN-SUFFIX,example.com", "DOMAIN,other.test"]
  }
}`}
            />
          </div>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <ProxyRuleApiPlayground />
        </div>
      </section>
    </div>
  )
}
