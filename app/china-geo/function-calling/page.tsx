import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * China GEO Function Calling page.
 * Documents GET /api/function-calling/tools and POST /api/function-calling/chat; playground to fetch tools list.
 */
export default function GeoFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Use the same tools as MCP in OpenAI-compatible format for chat completions. This server exposes all registered tools (holiday, fuel, exchange-rate, etc.)."
    />
  )
}
