import { moduleSkillMarkdownFilename } from '@/app/api/mcp/skillNaming'
import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { EXCHANGE_RATE_API_SKILL } from '../skill-content'

/**
 * Exchange rate Skill page: API usage for agents. Full-height editor-style layout.
 */
export default function ExchangeRateSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={EXCHANGE_RATE_API_SKILL} downloadFilename={moduleSkillMarkdownFilename('exchange-rate')} fill />
    </div>
  )
}
