import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * China Weather Function Calling page.
 * Documents OpenAI-compatible function calling endpoints and provides a playground scoped to China Weather tools.
 */
export default function WeatherFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="China Weather tools (get_point_weather, get_point_forecast) are available as OpenAI-compatible functions for LLM chat."
      defaultToolsCategory="weather"
    />
  )
}
