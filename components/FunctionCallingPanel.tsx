import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'
import { DocPlaygroundLayout } from '@/components/DocPlaygroundLayout'
import { TOOL_CATEGORIES } from '@/services/function-calling/categories'

import { FunctionCallingPlayground } from './FunctionCallingPlayground'

export interface FunctionCallingPanelProps {
  /** Panel title (e.g. "Function Calling", "Holiday Function Calling") */
  title: string
  /** Short description below the title */
  subtitle: string
  /** Tools category for playground: '' = geo (all tools), 'holiday' | 'fuel-price' | 'exchange-rate' = that module only. Omit = geo. */
  defaultToolsCategory?: string
}

/**
 * Shared doc + playground layout for Function Calling.
 * Left: endpoints (GET tools, POST chat) and short intro. Right: playground to fetch tools list.
 */
export function FunctionCallingPanel(props: FunctionCallingPanelProps) {
  const { title, subtitle, defaultToolsCategory } = props
  const category = defaultToolsCategory?.trim()
  const moduleCategory = category && TOOL_CATEGORIES.includes(category as (typeof TOOL_CATEGORIES)[number]) ? (category as (typeof TOOL_CATEGORIES)[number]) : null
  const isModulePage = Boolean(moduleCategory)

  return (
    <DocPlaygroundLayout
      doc={
        <>
          <DocPanelHeader title={title} subtitle={subtitle} />
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
            <p className="mb-3">
              The same tools as MCP are exposed in OpenAI-compatible format. Send the tools list to an LLM so it can return{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">tool_calls</code>; your gateway then executes them (e.g. via POST /api/mcp).
            </p>
            <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
            {isModulePage && moduleCategory ? (
              <>
                <div className={DOC_ENDPOINT_BOX_CLASS}>
                  <DocEndpointRow method="GET" path={`/api/function-calling/${moduleCategory}/tools`} enableCopy />
                  <p className={DOC_ENDPOINT_DESC_CLASS}>
                    Returns only tools for <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{moduleCategory}</code>.
                  </p>
                </div>
                <div className={DOC_ENDPOINT_BOX_CLASS}>
                  <DocEndpointRow method="POST" path={`/api/function-calling/chat?includes=${encodeURIComponent(moduleCategory)}`} enableCopy />
                  <p className={DOC_ENDPOINT_DESC_CLASS}>
                    Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ messages, model? }'}</code>. Filters allowed tools by{' '}
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">includes={moduleCategory}</code>, then executes tool_calls via MCP tools and returns the final
                    reply.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className={DOC_ENDPOINT_BOX_CLASS}>
                  <DocEndpointRow method="GET" path="/api/function-calling/tools" enableCopy />
                  <p className={DOC_ENDPOINT_DESC_CLASS}>
                    Returns all tools as <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ tools: [...] }'}</code> in OpenAI Chat Completions format.
                  </p>
                </div>
                <div className={DOC_ENDPOINT_BOX_CLASS}>
                  <DocEndpointRow method="GET" path="/api/function-calling/[category]/tools" enableCopy />
                  <p className={DOC_ENDPOINT_DESC_CLASS}>
                    Returns only tools for one category. <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">[category]</code>:{' '}
                    {TOOL_CATEGORIES.map((category, index) => (
                      <span key={category}>
                        <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{category}</code>
                        {index < TOOL_CATEGORIES.length - 1 ? ', ' : ''}
                      </span>
                    ))}{' '}
                    . Use when the caller needs a subset of tools.
                  </p>
                </div>
                <div className={DOC_ENDPOINT_BOX_CLASS}>
                  <DocEndpointRow method="POST" path="/api/function-calling/chat" enableCopy />
                  <p className={DOC_ENDPOINT_DESC_CLASS}>
                    Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ messages, model? }'}</code>. Requires{' '}
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">OPENAI_API_KEY</code>. The server sends messages + tools to OpenAI, runs tool_calls via MCP tools,
                    and returns the final reply.
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      }
      playground={
        <div className="flex min-h-0 flex-1 flex-col">
          <FunctionCallingPlayground defaultToolsCategory={defaultToolsCategory} />
        </div>
      }
    />
  )
}
