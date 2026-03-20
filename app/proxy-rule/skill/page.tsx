import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { PROXY_RULE_API_SKILL } from '../skill-content'

/**
 * Proxy rule skill install / copy page.
 */
export default function ProxyRuleSkillPage() {
  return <ApiSkillPanel content={PROXY_RULE_API_SKILL} downloadFilename="proxy-rule-api-skill.md" fill />
}
