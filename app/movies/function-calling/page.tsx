import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Movies Function Calling page.
 * Documents OpenAI-compatible function calling endpoints and provides a playground scoped to movies tools.
 */
export default function MoviesFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Movies-related tools (list_latest_movies) are available as OpenAI-compatible functions for LLM chat."
      defaultToolsCategory="movies"
    />
  )
}
