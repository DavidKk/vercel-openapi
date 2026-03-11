import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { HOLIDAY_API_SKILL } from '../skill-content'

/**
 * Holiday Skill page: API usage for agents. Full-height editor-style layout.
 */
export default function HolidaySkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={HOLIDAY_API_SKILL} downloadFilename="holiday-api-skill.md" fill />
    </div>
  )
}
