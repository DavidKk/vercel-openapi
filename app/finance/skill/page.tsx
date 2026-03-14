import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { TASI_API_SKILL } from '../skill-content'

/**
 * Finance Skill page: API usage for agents. Full-height editor-style layout.
 */
export default function FinanceTasiSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={TASI_API_SKILL} downloadFilename="finance-api-skill.md" fill />
    </div>
  )
}
