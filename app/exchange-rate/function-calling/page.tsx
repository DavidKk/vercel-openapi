import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Exchange rate Function Calling page.
 * Documents GET /api/function-calling/tools and POST /api/function-calling/chat; playground to fetch tools list.
 */
export default function ExchangeRateFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Exchange rate tools (get_exchange_rate, convert_currency) are exposed as OpenAI-compatible functions for LLM chat."
      defaultToolsCategory="exchange-rate"
    />
  )
}
