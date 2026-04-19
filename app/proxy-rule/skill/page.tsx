import { moduleSkillMarkdownFilename } from '@/app/api/mcp/skillNaming'
import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { PROXY_RULE_API_SKILL } from '../skill-content'

/**
 * Proxy rule skill install / copy page.
 */
export default function ProxyRuleSkillPage() {
  return <ApiSkillPanel content={PROXY_RULE_API_SKILL} downloadFilename={moduleSkillMarkdownFilename('proxy-rule')} fill />
}
