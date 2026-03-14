import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * DNS Query Function Calling page.
 * Documents GET /api/function-calling/tools and POST /api/function-calling/chat; playground for tools.
 */
export default function DnsFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="OpenAI-compatible tools including dns_query (domain, optional dns). Use the same tools as MCP in chat completions."
      defaultToolsCategory="dns"
    />
  )
}
