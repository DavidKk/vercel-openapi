import { FunctionCallingPanel } from '@/components/FunctionCallingPanel'

/**
 * Proxy rule Function Calling page.
 */
export default function ProxyRuleFunctionCallingPage() {
  return (
    <FunctionCallingPanel title="Function Calling" subtitle="Proxy rule tools: get_clash_rule_config (merged RULE-SET lines for an action)." defaultToolsCategory="proxy-rule" />
  )
}
