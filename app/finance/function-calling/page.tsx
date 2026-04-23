import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Finance Function Calling page.
 * Tools get_tasi_company_daily, get_tasi_summary_daily, and get_tasi_summary_hourly expose finance data as OpenAI-compatible functions.
 */
export default function FinanceTasiFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Finance tools (get_tasi_company_daily, get_tasi_summary_daily, get_tasi_summary_hourly; daily snapshot/single-day/K-line plus hourly alignment check) are exposed as OpenAI-compatible functions for LLM chat."
      defaultToolsCategory="finance"
    />
  )
}
