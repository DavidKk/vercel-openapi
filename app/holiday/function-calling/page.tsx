import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Holiday Function Calling page.
 * Documents GET /api/function-calling/tools and POST /api/function-calling/chat; playground to fetch tools list.
 */
export default function HolidayFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Holiday-related tools (get_today_holiday, list_holiday, is_workday, is_holiday) are available as OpenAI-compatible functions for LLM chat."
      defaultToolsCategory="holiday"
    />
  )
}
