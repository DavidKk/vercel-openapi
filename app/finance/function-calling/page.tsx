import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Finance Function Calling page.
 * Tools get_tasi_company_daily and get_tasi_summary_daily exposed as OpenAI-compatible functions.
 */
export default function FinanceTasiFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Finance tools (get_tasi_company_daily, get_tasi_summary_daily; currently TASI) are exposed as OpenAI-compatible functions for LLM chat."
      defaultToolsCategory="finance"
    />
  )
}
