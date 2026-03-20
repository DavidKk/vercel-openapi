import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { ProxyRuleMcpPlayground } from './components'

/**
 * Proxy rule MCP tools page.
 */
export default function ProxyRuleMcpPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Proxy rule MCP tools" subtitle="Call merged clash config via MCP." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/mcp/proxy-rule" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ tool, params }'}</code>
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Tools</h2>
          <ul className="mb-3 list-disc pl-4">
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">get_clash_rule_config</code> — params:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">type</code> (e.g. Proxy).
            </li>
          </ul>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <ProxyRuleMcpPlayground />
        </div>
      </section>
    </div>
  )
}
