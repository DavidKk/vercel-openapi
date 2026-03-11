import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { GEO_API_SKILL } from '../skill-content'

/**
 * Geo Skill page: API usage for agents. Full-height editor-style layout.
 */
export default function GeoSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={GEO_API_SKILL} downloadFilename="geo-api-skill.md" fill />
    </div>
  )
}
