import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Weather Function Calling page.
 * Documents OpenAI-compatible function calling endpoints and provides a playground scoped to weather tools.
 */
export default function WeatherFunctionCallingPage() {
  return (
    <FunctionCallingPanel
      title="Function Calling"
      subtitle="Weather-related tools (get_point_weather, get_point_forecast) are available as OpenAI-compatible functions for LLM chat."
      defaultToolsCategory="weather"
    />
  )
}
