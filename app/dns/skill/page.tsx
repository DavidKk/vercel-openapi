import { moduleSkillMarkdownFilename } from '@/app/api/mcp/skillNaming'
import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { DNS_API_SKILL } from '../skill-content'

/**
 * DNS Skill page: API usage for agents. Full-height editor-style layout.
 */
export default function DnsSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={DNS_API_SKILL} downloadFilename={moduleSkillMarkdownFilename('dns')} fill />
    </div>
  )
}
