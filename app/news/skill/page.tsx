import { ApiSkillPanel } from '@/components/ApiSkillPanel'

import { NEWS_API_SKILL } from '../skill-content'

/**
 * News Skill page for agent-oriented API notes.
 */
export default function NewsSkillPage() {
  return (
    <div className="flex h-full flex-col">
      <ApiSkillPanel content={NEWS_API_SKILL} downloadFilename="news-api-skill.md" fill />
    </div>
  )
}
