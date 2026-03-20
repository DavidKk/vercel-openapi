import type { FormSelectOption } from '@/components/FormSelect'

/** Common Clash rule actions for `GET /api/proxy-rule/clash/config?type=` (server accepts any matching action string). */
const CLASH_CONFIG_TYPE_PRESETS = ['Proxy', 'DIRECT', 'REJECT', 'MATCH', 'Streaming', 'StreamingSE', 'ChatGPT'] as const

/**
 * Build FormSelect options for the clash config `type` query parameter.
 * @returns Value/label pairs for API and MCP playgrounds
 */
export function getClashConfigTypeFormOptions(): FormSelectOption[] {
  return CLASH_CONFIG_TYPE_PRESETS.map((value) => ({ value, label: value }))
}
