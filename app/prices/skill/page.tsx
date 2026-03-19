import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { PRICES_API_SKILL } from '../skill-content'

/**
 * Prices skill page.
 * @returns Skill panel
 */
export default function PricesSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={PRICES_API_SKILL} downloadFilename="prices-api-skill.md" fill />
    </div>
  )
}
